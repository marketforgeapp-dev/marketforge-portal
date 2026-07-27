"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CampaignAsset, CampaignStatus } from "@/generated/prisma";
import { saveCampaignAssetEdit } from "@/app/campaigns/[campaignId]/actions";
import { getActionImage } from "@/lib/action-imagery";

type Props = {
  campaignId: string;
  status: CampaignStatus;
  assets: CampaignAsset[];
  briefJson?: unknown;
  logoUrl?: string | null;
  businessName?: string | null;
  websiteUrl?: string | null;
  industryLabel?: string | null;
};

type AssetEditorState = {
  assetId: string;
  title: string;
  content: string;
  structuredKind?: "GOOGLE_BUSINESS" | "META" | "EMAIL" | "BLOG" | null;
  fields?: Record<string, string>;
};

type GoogleBusinessAssetPayload = {
  kind: "GOOGLE_BUSINESS";
  title: string;
  description: string;
  cta: string;
  offer?: string | null;
  imageKey: string;
  imageMode: "SERVICE_IMAGE" | "LOGO";
  industry: string;
  industryLabel?: string | null;
};

type MetaAssetPayload = {
  kind: "META";
  headline: string;
  primaryText: string;
  cta: string;
  offer?: string | null;
  imageKey: string;
  imageMode: "SERVICE_IMAGE" | "LOGO";
  industry: string;
  industryLabel?: string | null;
};

type EmailAssetPayload = {
  kind: "EMAIL";
  subject: string;
  previewLine: string;
  body: string;
  cta: string;
  industry: string;
};

type BlogAssetPayload = {
  kind: "BLOG";
  title: string;
  excerpt: string;
  introduction: string;
  sections: Array<{
    heading: string;
    body: string;
  }>;
  cta: string;
  imageKey: string;
  imageMode: "SERVICE_IMAGE" | "LOGO";
  industry: string;
  industryLabel?: string | null;
};

type StructuredAssetPayload =
  | GoogleBusinessAssetPayload
  | MetaAssetPayload
  | EmailAssetPayload
  | BlogAssetPayload;

type CommercialAssetMetadata = {
  market?: "COMMERCIAL";
  commercialAssetId?: string;
  commercialCategory?: string;
  commercialCategoryLabel?: string;
  readiness?:
    | "READY_NOW"
    | "OWNER_INPUT_REQUIRED"
    | "ACCOUNT_DISCOVERY_REQUIRED";
  purpose?: string;
  requiredOwnerInputKeys?: string[];
  requiredAccountDiscoveryItems?: string[];
  usageInstructions?: string;
  completionSignal?: string;
};

type CommercialOwnerInputRequirement = {
  key?: string;
  label?: string;
  reason?: string;
  requiredBefore?:
    | "INITIAL_OUTREACH"
    | "DISCOVERY"
    | "PROPOSAL"
    | "CONTRACT"
    | "ONBOARDING";
  currentValue?: string | null;
};

type CommercialBriefShape = {
  commercialActionSpec?: {
    ownerInputRequirements?:
      CommercialOwnerInputRequirement[];
  };
};

type CommercialAssetInputSummary = {
  requiredBeforeLaunch:
    CommercialOwnerInputRequirement[];

  requiredLater:
    CommercialOwnerInputRequirement[];
};

function formatAssetType(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function parseCommercialAssetMetadata(
  asset: CampaignAsset
): CommercialAssetMetadata | null {
  const metadata = asset.metadataJson;

  if (
    !metadata ||
    typeof metadata !== "object" ||
    Array.isArray(metadata)
  ) {
    return null;
  }

  const parsed =
    metadata as Record<string, unknown>;

  if (
    parsed.market !== "COMMERCIAL" ||
    typeof parsed.commercialCategory !==
      "string"
  ) {
    return null;
  }

  return parsed as CommercialAssetMetadata;
}

function getCommercialAssetLabel(
  asset: CampaignAsset
) {
  const metadata =
    parseCommercialAssetMetadata(asset);

  if (!metadata) {
    return null;
  }

  return (
    metadata.commercialCategoryLabel ??
    formatAssetType(
      metadata.commercialCategory ??
        "Commercial Asset"
    )
  );
}

function getAssetReviewLabel(
  asset: CampaignAsset
) {
  return (
    getCommercialAssetLabel(asset) ??
    formatAssetType(asset.assetType)
  );
}

function parseCommercialBrief(
  value: unknown
): CommercialBriefShape | null {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  return value as CommercialBriefShape;
}

function normalizeRequirementKey(
  value: string
) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getCommercialAssetInputSummary(params: {
  asset: CampaignAsset;
  briefJson: unknown;
}): CommercialAssetInputSummary | null {
  const metadata =
    parseCommercialAssetMetadata(
      params.asset
    );

  if (!metadata) {
    return null;
  }

  const brief =
    parseCommercialBrief(
      params.briefJson
    );

  const requirements =
    brief?.commercialActionSpec
      ?.ownerInputRequirements ??
    [];

  const assetKeys =
    new Set(
      (
        metadata
          .requiredOwnerInputKeys ??
        []
      ).map(
        normalizeRequirementKey
      )
    );

  const assetRequirements =
    requirements.filter(
      (requirement) => {
        if (
          requirement.currentValue
            ?.trim()
        ) {
          return false;
        }

        const key =
          normalizeRequirementKey(
            requirement.key ?? ""
          );

        return (
          key.length > 0 &&
          assetKeys.has(key)
        );
      }
    );

  return {
    requiredBeforeLaunch:
      assetRequirements.filter(
        (requirement) =>
          requirement
            .requiredBefore ===
          "INITIAL_OUTREACH"
      ),

    requiredLater:
      assetRequirements.filter(
        (requirement) =>
          requirement
            .requiredBefore !==
          "INITIAL_OUTREACH"
      ),
  };
}

function parseStructuredAsset(
  asset: CampaignAsset
): StructuredAssetPayload | null {
  try {
    const parsed = JSON.parse(asset.content);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as StructuredAssetPayload;
  } catch {
    return null;
  }
}

function groupAssetsForReview(
  assets: CampaignAsset[]
) {
  const commercialAssets =
    assets.filter(
      (asset) =>
        parseCommercialAssetMetadata(
          asset
        ) !== null
    );

  if (commercialAssets.length > 0) {
    const orderedCommercialCategories = [
      "ACCOUNT_BRIEF",
      "CAPABILITY_STATEMENT",
      "INITIAL_OUTREACH",
      "PHONE_SCRIPT",
      "VOICEMAIL",
      "DIRECT_MESSAGE",
      "OFFICE_VISIT",
      "QUALIFICATION",
      "DISCOVERY",
      "WALKTHROUGH",
      "VENDOR_READINESS",
      "PROPOSAL",
      "MAINTENANCE_AGREEMENT",
      "OBJECTION_HANDLING",
      "FOLLOW_UP",
      "NEGOTIATION",
      "ONBOARDING",
    ];

    const grouped =
      orderedCommercialCategories
        .map((category) => {
          const categoryAssets =
            commercialAssets.filter(
              (asset) =>
                parseCommercialAssetMetadata(
                  asset
                )
                  ?.commercialCategory ===
                category
            );

          return {
            key:
              `commercial-${category}`,

            label:
              formatAssetType(category),

            subtitle:
              "Review, edit, approve, or remove this Commercial pursuit material.",

            assets:
              categoryAssets,
          };
        })
        .filter(
          (group) =>
            group.assets.length > 0
        );

    const recognizedIds =
      new Set(
        grouped.flatMap(
          (group) =>
            group.assets.map(
              (asset) =>
                asset.id
            )
        )
      );

    const remainingCommercialAssets =
      commercialAssets.filter(
        (asset) =>
          !recognizedIds.has(
            asset.id
          )
      );

    if (
      remainingCommercialAssets.length >
      0
    ) {
      grouped.push({
        key:
          "commercial-other",

        label:
          "Other Commercial Materials",

        subtitle:
          "Review, edit, approve, or remove these additional Commercial pursuit materials.",

        assets:
          remainingCommercialAssets,
      });
    }

    return grouped;
  }

  const orderedTypes = [
    "GOOGLE_BUSINESS",
    "META",
    "GOOGLE_ADS",
    "YELP",
    "EMAIL",
    "BLOG",
    "AEO_FAQ",
    "ANSWER_SNIPPET",
    "SEO",
  ];

  const buckets =
    orderedTypes
      .map((type) => ({
        key:
          type,

        label:
          formatAssetType(type),

        subtitle:
          type === "META"
            ? "One approved Meta asset is previewed as both Facebook and Instagram."
            : "Approve only what you want included in execution and export.",

        assets:
          assets.filter(
            (asset) =>
              asset.assetType ===
              type
          ),
      }))
      .filter(
        (bucket) =>
          bucket.assets.length > 0
      );

  const remaining =
    assets.filter(
      (asset) =>
        !orderedTypes.includes(
          asset.assetType
        )
    );

  if (remaining.length > 0) {
    buckets.push({
      key:
        "OTHER",

      label:
        "Other",

      subtitle:
        "Approve only what you want included in execution and export.",

      assets:
        remaining,
    });
  }

  return buckets;
}

function StatusBadge({ isApproved }: { isApproved: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        isApproved
          ? "bg-green-100 text-green-800"
          : "bg-amber-100 text-amber-800"
      }`}
    >
      {isApproved ? "Approved" : "Needs Review"}
    </span>
  );
}

function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
        {title}
      </p>
      <p className="mt-1 text-sm text-gray-700">{subtitle}</p>
    </div>
  );
}

function PlatformShell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-600">
          {label}
        </p>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function getAssetDisplayImage(params: {
  aiImageUrl?: string | null;
  fallback: {
    src: string;
    alt: string;
  };
}) {
  if (params.aiImageUrl) {
    return {
      src: params.aiImageUrl,
      alt: "Creative generated for this action",
      isAi: true,
    };
  }

  return {
    src: params.fallback.src,
    alt: params.fallback.alt,
    isAi: false,
  };
}

function GoogleBusinessPreview({
  payload,
  logoUrl,
  businessName,
  industryLabel,
  aiImageUrl,
}: {
  payload: GoogleBusinessAssetPayload;
  logoUrl?: string | null;
  businessName?: string | null;
  industryLabel?: string | null;
  aiImageUrl?: string | null;
}) {
  const fallbackImage = getActionImage({
    industry: payload.industry,
    workspaceIndustry: industryLabel,
    imageKey: payload.imageKey,
    imageMode: payload.imageMode,
    logoUrl,
  });

  const image = getAssetDisplayImage({
    aiImageUrl,
    fallback: fallbackImage,
  });

  return (
    <PlatformShell label="Google Business Profile Post Preview">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="h-10 w-10 rounded-full bg-[#1a73e8]" />
          <div>
            <p className="text-sm font-semibold text-gray-900">
  {businessName ?? "Business Name"}
</p>
            <p className="text-xs text-gray-500">Google Business Profile</p>
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.src}
              alt={image.alt}
              className="h-full w-full object-cover aspect-square"
            />
          </div>
                  {image.isAi ? (
          <div className="mt-2 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
            Creative generated for this action
          </div>
        ) : null}

          <p className="mt-4 text-sm font-semibold text-gray-900">
            {payload.title}
          </p>
          <p className="mt-2 text-sm leading-6 text-gray-800">
            {payload.description}
          </p>

          <button
            type="button"
            className="mt-4 rounded-lg bg-[#1a73e8] px-4 py-2 text-sm font-semibold text-white"
          >
            {payload.cta || "Learn More"}
          </button>
        </div>
      </div>
    </PlatformShell>
  );
}

function FacebookPreview({
  payload,
  logoUrl,
  businessName,
  websiteUrl,
  industryLabel,
  aiImageUrl,
}: {
  payload: MetaAssetPayload;
  logoUrl?: string | null;
  businessName?: string | null;
  websiteUrl?: string | null;
  industryLabel?: string | null;
  aiImageUrl?: string | null;
}) {
const fallbackImage = getActionImage({
  industry: payload.industry,
  workspaceIndustry: industryLabel,
  imageKey: payload.imageKey,
  imageMode: payload.imageMode,
  logoUrl,
});

const image = getAssetDisplayImage({
  aiImageUrl,
  fallback: fallbackImage,
});

  return (
    <PlatformShell label="Facebook Preview">
      <div className="rounded-2xl border border-gray-200 bg-white">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="h-10 w-10 rounded-full bg-[#1877F2]" />
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {businessName ?? "Business Name"}
            </p>
            <p className="text-xs text-gray-500">Sponsored • Facebook</p>
          </div>
        </div>

        <div className="px-4 pb-4">
          <p className="mb-2 text-sm font-semibold text-gray-900">
            {payload.headline}
          </p>

          <p className="whitespace-pre-wrap text-sm leading-6 text-gray-800">
            {payload.primaryText}
          </p>

          <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.src}
              alt={image.alt}
              className="h-full w-full object-cover aspect-[1.91/1]"
            />
          </div>
                    {image.isAi ? (
            <div className="mt-2 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
              Creative generated for this action
            </div>
          ) : null}

          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
            <p className="text-[11px] uppercase tracking-wide text-gray-500">
              Sponsored Link
            </p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-gray-500">
                  {websiteUrl ?? "business.com"}
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {payload.headline}
                </p>
              </div>
              <button
                type="button"
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-900"
              >
                {payload.cta || "Book Now"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </PlatformShell>
  );
}

function InstagramPreview({
  payload,
  logoUrl,
  businessName,
  industryLabel,
  aiImageUrl,
}: {
  payload: MetaAssetPayload;
  logoUrl?: string | null;
  businessName?: string | null;
  industryLabel?: string | null;
  aiImageUrl?: string | null;
}) {
const fallbackImage = getActionImage({
  industry: payload.industry,
  workspaceIndustry: industryLabel,
  imageKey: payload.imageKey,
  imageMode: payload.imageMode,
  logoUrl,
});

const image = getAssetDisplayImage({
  aiImageUrl,
  fallback: fallbackImage,
});

  return (
    <PlatformShell label="Instagram Preview">
      <div className="mx-auto max-w-[360px] rounded-[28px] border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500" />
          <div>
            <p className="text-sm font-semibold text-gray-900">
  {(businessName ?? "businessname").replace(/\s+/g, "").toLowerCase()}
</p>
            <p className="text-xs text-gray-500">Sponsored</p>
          </div>
        </div>

        <div className="overflow-hidden bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.src}
            alt={image.alt}
            className="h-full w-full object-cover aspect-square"
          />
        </div>
        {image.isAi ? (
          <div className="px-4 pt-3">
            <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
              Creative generated for this action
            </span>
          </div>
        ) : null}
        <div className="px-4 py-3">
          <p className="text-sm font-semibold text-gray-900">
            {payload.headline}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-800">
            {payload.primaryText}
          </p>
        </div>
      </div>
    </PlatformShell>
  );
}

function GoogleAdsPreview({
  title,
  content,
  aiImageUrl,
}: {
  title: string | null;
  content: string;
  aiImageUrl?: string | null;
}) {
  return (
    <PlatformShell label="Google Ads Search Preview">
      <div className="space-y-4">
        {aiImageUrl ? (
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <img
              src={aiImageUrl}
              alt="Creative generated for this action"
              className="h-full w-full object-cover aspect-[1.91/1]"
            />
            <div className="border-t border-gray-200 bg-emerald-50 px-4 py-2">
              <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                Creative generated for this action
              </span>
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Ad • business.com</p>
          <p className="mt-2 text-lg font-medium text-[#1a0dab]">
            {title || "Local Service Near You"} | Book Today | Fast Response
          </p>
          <p className="mt-2 text-sm leading-6 text-gray-800">
            {content || "Google Ads copy preview will appear here."}
          </p>
        </div>
      </div>
    </PlatformShell>
  );
}

function YelpPreview({
  title,
  content,
  businessName,
}: {
  title: string | null;
  content: string;
  businessName?: string | null;
}) {
  return (
    <PlatformShell label="Yelp Preview">
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-[#d32323]" />
                    <p className="text-sm font-semibold text-gray-900">
            {businessName ?? "Business Name"}
          </p>
        </div>

        {title ? (
          <p className="mt-3 text-sm font-semibold text-gray-900">{title}</p>
        ) : null}

        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-800">
          {content || "Yelp content preview will appear here."}
        </p>
      </div>
    </PlatformShell>
  );
}

function EmailPreview({ payload }: { payload: EmailAssetPayload }) {
  return (
    <PlatformShell label="Email Preview">
      <div className="rounded-2xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-500">Subject Line</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            {payload.subject}
          </p>
          <p className="mt-2 text-xs text-gray-500">Preview Line</p>
          <p className="mt-1 text-sm text-gray-700">{payload.previewLine}</p>
        </div>
        <div className="p-4">
          <p className="whitespace-pre-wrap text-sm leading-6 text-gray-800">
            {payload.body}
          </p>
          <button
            type="button"
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            {payload.cta || "Learn More"}
          </button>
        </div>
      </div>
    </PlatformShell>
  );
}

function BlogPreview({
  payload,
  logoUrl,
  industryLabel,
}: {
  payload: BlogAssetPayload;
  logoUrl?: string | null;
  industryLabel?: string | null;
}) {
const image = getActionImage({
  industry: payload.industry,
  workspaceIndustry: industryLabel,
  imageKey: payload.imageKey,
  imageMode: payload.imageMode,
  logoUrl,
});

  return (
    <PlatformShell label="Blog Article Preview">
      <article className="rounded-2xl border border-gray-200 bg-white p-0 overflow-hidden">
        <div className="overflow-hidden bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.src}
            alt={image.alt}
            className="h-full w-full object-cover aspect-[16/9]"
          />
        </div>

        <div className="p-6">
          <p className="text-xs uppercase tracking-[0.14em] text-gray-500">
            Article
          </p>
          <h3 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
            {payload.title}
          </h3>
          <p className="mt-3 text-base leading-7 text-gray-700">
            {payload.excerpt}
          </p>

          <p className="mt-5 text-sm leading-7 text-gray-800">
            {payload.introduction}
          </p>

          <div className="mt-6 space-y-5">
            {payload.sections.map((section) => (
              <section key={section.heading}>
                <h4 className="text-lg font-semibold text-gray-900">
                  {section.heading}
                </h4>
                <p className="mt-2 text-sm leading-7 text-gray-800">
                  {section.body}
                </p>
              </section>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-semibold text-gray-900">CTA</p>
            <p className="mt-2 text-sm text-gray-700">
              {payload.cta || "Book now"}
            </p>
          </div>
        </div>
      </article>
    </PlatformShell>
  );
}

function TextBlockPreview({
  label,
  title,
  content,
}: {
  label: string;
  title: string | null;
  content: string;
}) {
  return (
    <PlatformShell label={label}>
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        {title ? (
          <p className="text-sm font-semibold text-gray-900">{title}</p>
        ) : null}
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-800">
          {content || "Content preview will appear here."}
        </p>
      </div>
    </PlatformShell>
  );
}

function AssetPreview({
  asset,
  logoUrl,
  businessName,
  websiteUrl,
  industryLabel,
}: {
  asset: CampaignAsset;
  logoUrl?: string | null;
  businessName?: string | null;
  websiteUrl?: string | null;
  industryLabel?: string | null;
}) {
    const structured =
    parseStructuredAsset(asset);

  const commercialMetadata =
    parseCommercialAssetMetadata(
      asset
    );

  if (commercialMetadata) {
    return (
      <TextBlockPreview
        label={`${getAssetReviewLabel(
          asset
        )} Preview`}
        title={asset.title}
        content={asset.content}
      />
    );
  }

  if (
    asset.assetType ===
      "GOOGLE_BUSINESS" &&
    structured?.kind ===
      "GOOGLE_BUSINESS"
  ) {
    return (
      <GoogleBusinessPreview
        payload={structured}
        logoUrl={logoUrl}
        businessName={businessName}
        industryLabel={industryLabel}
        aiImageUrl={asset.aiImageUrl}
      />
    );
  }

    if (asset.assetType === "META" && structured?.kind === "META") {
    return (
      <div className="grid gap-4 xl:grid-cols-2">
        <FacebookPreview
          payload={structured}
          logoUrl={logoUrl}
          businessName={businessName}
          industryLabel={industryLabel}
          websiteUrl={websiteUrl}
          aiImageUrl={asset.aiImageUrl}
        />
        <InstagramPreview
          payload={structured}
          logoUrl={logoUrl}
          businessName={businessName}
          industryLabel={industryLabel}
          aiImageUrl={asset.aiImageUrl}
        />
      </div>
    );
  }

  if (asset.assetType === "EMAIL" && structured?.kind === "EMAIL") {
    return <EmailPreview payload={structured} />;
  }

  if (asset.assetType === "BLOG" && structured?.kind === "BLOG") {
    return (
  <BlogPreview
    payload={structured}
    logoUrl={logoUrl}
    industryLabel={industryLabel}
  />
);
  }

    if (asset.assetType === "GOOGLE_ADS") {
    return (
      <GoogleAdsPreview
        title={asset.title}
        content={asset.content}
        aiImageUrl={asset.aiImageUrl}
      />
    );
  }

    if (asset.assetType === "YELP") {
    return (
      <YelpPreview
        title={asset.title}
        content={asset.content}
        businessName={businessName}
      />
    );
  }

  if (asset.assetType === "AEO_FAQ") {
    return (
      <TextBlockPreview
        label="AEO / FAQ Preview"
        title={asset.title}
        content={asset.content}
      />
    );
  }

  if (asset.assetType === "ANSWER_SNIPPET") {
    return (
      <TextBlockPreview
        label="Answer Snippet Preview"
        title={asset.title}
        content={asset.content}
      />
    );
  }

  if (asset.assetType === "SEO") {
    return (
      <TextBlockPreview
        label="SEO Content Preview"
        title={asset.title}
        content={asset.content}
      />
    );
  }

  return (
    <TextBlockPreview
      label={`${formatAssetType(asset.assetType)} Preview`}
      title={asset.title}
      content={asset.content}
    />
  );
}

function buildEditorContent(asset: CampaignAsset): AssetEditorState {
  const structured = parseStructuredAsset(asset);

  if (!structured) {
    return {
      assetId: asset.id,
      title: asset.title ?? "",
      content: asset.content,
      structuredKind: null,
      fields: {},
    };
  }

  if (structured.kind === "GOOGLE_BUSINESS") {
    return {
      assetId: asset.id,
      title: structured.title,
      content: asset.content,
      structuredKind: "GOOGLE_BUSINESS",
      fields: {
        title: structured.title,
        description: structured.description,
        cta: structured.cta,
      },
    };
  }

  if (structured.kind === "META") {
    return {
      assetId: asset.id,
      title: structured.headline,
      content: asset.content,
      structuredKind: "META",
      fields: {
        headline: structured.headline,
        primaryText: structured.primaryText,
        cta: structured.cta,
      },
    };
  }

  if (structured.kind === "EMAIL") {
    return {
      assetId: asset.id,
      title: structured.subject,
      content: asset.content,
      structuredKind: "EMAIL",
      fields: {
        subject: structured.subject,
        previewLine: structured.previewLine,
        body: structured.body,
        cta: structured.cta,
      },
    };
  }

  if (structured.kind === "BLOG") {
    return {
      assetId: asset.id,
      title: structured.title,
      content: asset.content,
      structuredKind: "BLOG",
      fields: {
        title: structured.title,
        excerpt: structured.excerpt,
        introduction: structured.introduction,
        section1Heading: structured.sections[0]?.heading ?? "",
        section1Body: structured.sections[0]?.body ?? "",
        section2Heading: structured.sections[1]?.heading ?? "",
        section2Body: structured.sections[1]?.body ?? "",
        section3Heading: structured.sections[2]?.heading ?? "",
        section3Body: structured.sections[2]?.body ?? "",
        cta: structured.cta,
      },
    };
  }

  return {
    assetId: asset.id,
    title: asset.title ?? "",
    content: asset.content,
    structuredKind: null,
    fields: {},
  };
}

function buildSavedContentFromEditor(
  asset: CampaignAsset,
  editor: AssetEditorState
): { title: string; content: string } {
  const structured = parseStructuredAsset(asset);

  if (!structured || !editor.structuredKind || !editor.fields) {
    return {
      title: editor.title,
      content: editor.content,
    };
  }

  if (editor.structuredKind === "GOOGLE_BUSINESS" && structured.kind === "GOOGLE_BUSINESS") {
    const next = {
      ...structured,
      title: editor.fields.title ?? structured.title,
      description: editor.fields.description ?? structured.description,
      cta: editor.fields.cta ?? structured.cta,
    };

    return {
      title: next.title,
      content: JSON.stringify(next),
    };
  }

  if (editor.structuredKind === "META" && structured.kind === "META") {
    const next = {
      ...structured,
      headline: editor.fields.headline ?? structured.headline,
      primaryText: editor.fields.primaryText ?? structured.primaryText,
      cta: editor.fields.cta ?? structured.cta,
    };

    return {
      title: next.headline,
      content: JSON.stringify(next),
    };
  }

  if (editor.structuredKind === "EMAIL" && structured.kind === "EMAIL") {
    const next = {
      ...structured,
      subject: editor.fields.subject ?? structured.subject,
      previewLine: editor.fields.previewLine ?? structured.previewLine,
      body: editor.fields.body ?? structured.body,
      cta: editor.fields.cta ?? structured.cta,
    };

    return {
      title: next.subject,
      content: JSON.stringify(next),
    };
  }

  if (editor.structuredKind === "BLOG" && structured.kind === "BLOG") {
    const next = {
      ...structured,
      title: editor.fields.title ?? structured.title,
      excerpt: editor.fields.excerpt ?? structured.excerpt,
      introduction: editor.fields.introduction ?? structured.introduction,
      sections: [
        {
          heading: editor.fields.section1Heading ?? structured.sections[0]?.heading ?? "",
          body: editor.fields.section1Body ?? structured.sections[0]?.body ?? "",
        },
        {
          heading: editor.fields.section2Heading ?? structured.sections[1]?.heading ?? "",
          body: editor.fields.section2Body ?? structured.sections[1]?.body ?? "",
        },
        {
          heading: editor.fields.section3Heading ?? structured.sections[2]?.heading ?? "",
          body: editor.fields.section3Body ?? structured.sections[2]?.body ?? "",
        },
      ],
      cta: editor.fields.cta ?? structured.cta,
    };

    return {
      title: next.title,
      content: JSON.stringify(next),
    };
  }

  return {
    title: editor.title,
    content: editor.content,
  };
}

function StructuredAssetEditorFields({
  editor,
  setEditor,
}: {
  editor: AssetEditorState;
  setEditor: React.Dispatch<React.SetStateAction<AssetEditorState | null>>;
}) {
  if (!editor.structuredKind || !editor.fields) {
    return null;
  }

  function updateField(key: string, value: string) {
    setEditor((current) => {
      if (!current) return current;

      return {
        ...current,
        fields: {
          ...(current.fields ?? {}),
          [key]: value,
        },
        title:
          key === "title" || key === "headline" || key === "subject"
            ? value
            : current.title,
      };
    });
  }

  const inputClass =
    "mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900";
  const textareaClass =
    "mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm leading-6 text-gray-800";

  if (editor.structuredKind === "GOOGLE_BUSINESS") {
    return (
      <div className="space-y-4">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
            Post Title
          </label>
          <input
            value={editor.fields.title ?? ""}
            onChange={(e) => updateField("title", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
            Description
          </label>
          <textarea
            rows={6}
            value={editor.fields.description ?? ""}
            onChange={(e) => updateField("description", e.target.value)}
            className={textareaClass}
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
            CTA
          </label>
          <input
            value={editor.fields.cta ?? ""}
            onChange={(e) => updateField("cta", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
    );
  }

  if (editor.structuredKind === "META") {
    return (
      <div className="space-y-4">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
            Headline
          </label>
          <input
            value={editor.fields.headline ?? ""}
            onChange={(e) => updateField("headline", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
            Primary Text
          </label>
          <textarea
            rows={6}
            value={editor.fields.primaryText ?? ""}
            onChange={(e) => updateField("primaryText", e.target.value)}
            className={textareaClass}
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
            CTA
          </label>
          <input
            value={editor.fields.cta ?? ""}
            onChange={(e) => updateField("cta", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
    );
  }

  if (editor.structuredKind === "EMAIL") {
    return (
      <div className="space-y-4">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
            Subject
          </label>
          <input
            value={editor.fields.subject ?? ""}
            onChange={(e) => updateField("subject", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
            Preview Line
          </label>
          <input
            value={editor.fields.previewLine ?? ""}
            onChange={(e) => updateField("previewLine", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
            Body
          </label>
          <textarea
            rows={10}
            value={editor.fields.body ?? ""}
            onChange={(e) => updateField("body", e.target.value)}
            className={textareaClass}
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
            CTA
          </label>
          <input
            value={editor.fields.cta ?? ""}
            onChange={(e) => updateField("cta", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
    );
  }

  if (editor.structuredKind === "BLOG") {
    return (
      <div className="space-y-4">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
            Title
          </label>
          <input
            value={editor.fields.title ?? ""}
            onChange={(e) => updateField("title", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
            Excerpt
          </label>
          <textarea
            rows={3}
            value={editor.fields.excerpt ?? ""}
            onChange={(e) => updateField("excerpt", e.target.value)}
            className={textareaClass}
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
            Introduction
          </label>
          <textarea
            rows={5}
            value={editor.fields.introduction ?? ""}
            onChange={(e) => updateField("introduction", e.target.value)}
            className={textareaClass}
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
            Section 1 Heading
          </label>
          <input
            value={editor.fields.section1Heading ?? ""}
            onChange={(e) => updateField("section1Heading", e.target.value)}
            className={inputClass}
          />
          <textarea
            rows={4}
            value={editor.fields.section1Body ?? ""}
            onChange={(e) => updateField("section1Body", e.target.value)}
            className={`${textareaClass} mt-2`}
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
            Section 2 Heading
          </label>
          <input
            value={editor.fields.section2Heading ?? ""}
            onChange={(e) => updateField("section2Heading", e.target.value)}
            className={inputClass}
          />
          <textarea
            rows={4}
            value={editor.fields.section2Body ?? ""}
            onChange={(e) => updateField("section2Body", e.target.value)}
            className={`${textareaClass} mt-2`}
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
            Section 3 Heading
          </label>
          <input
            value={editor.fields.section3Heading ?? ""}
            onChange={(e) => updateField("section3Heading", e.target.value)}
            className={inputClass}
          />
          <textarea
            rows={4}
            value={editor.fields.section3Body ?? ""}
            onChange={(e) => updateField("section3Body", e.target.value)}
            className={`${textareaClass} mt-2`}
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
            CTA
          </label>
          <input
            value={editor.fields.cta ?? ""}
            onChange={(e) => updateField("cta", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
    );
  }

  return null;
}

export function CampaignAssetsReview({
  campaignId,
  status,
  assets,
  briefJson,
  logoUrl,
  businessName,
  websiteUrl,
  industryLabel,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editor, setEditor] = useState<AssetEditorState | null>(null);

    const canEdit =
    status !== "LAUNCHED" &&
    status !== "COMPLETED";

  const hasCommercialAssets =
    useMemo(
      () =>
        assets.some(
          (asset) =>
            parseCommercialAssetMetadata(
              asset
            ) !== null
        ),
      [assets]
    );

  const groupedAssets =
    useMemo(
      () =>
        groupAssetsForReview(
          assets
        ),
      [assets]
    );
  const commercialInputSummary =
  useMemo(() => {
    if (!hasCommercialAssets) {
      return null;
    }

    const summaries =
      assets
        .map((asset) =>
          getCommercialAssetInputSummary({
            asset,
            briefJson,
          })
        )
        .filter(
          (
            summary
          ): summary is CommercialAssetInputSummary =>
            summary !== null
        );

    const requiredBeforeLaunch =
      summaries.flatMap(
        (summary) =>
          summary.requiredBeforeLaunch
      );

    const requiredLater =
      summaries.flatMap(
        (summary) =>
          summary.requiredLater
      );

    const dedupe = (
      requirements:
        CommercialOwnerInputRequirement[]
    ) =>
      Array.from(
        new Map(
          requirements.map(
            (requirement) => [
              requirement.key ??
                requirement.label ??
                JSON.stringify(
                  requirement
                ),
              requirement,
            ]
          )
        ).values()
      );

    return {
      requiredBeforeLaunch:
        dedupe(
          requiredBeforeLaunch
        ),

      requiredLater:
        dedupe(
          requiredLater
        ),
    };
  }, [
    assets,
    briefJson,
    hasCommercialAssets,
  ]);
  const pendingApprovalCount = useMemo(
    () => assets.filter((asset) => !asset.isApproved).length,
    [assets]
  );

  async function handleApprove(assetId: string) {
    startTransition(async () => {
      await fetch(`/api/campaign-assets/${assetId}/approve`, {
        method: "POST",
      });
      router.refresh();
    });
  }

    async function handleApproveAll() {
    const assetIdsToApprove = assets
      .filter((asset) => !asset.isApproved)
      .map((asset) => asset.id);

    if (assetIdsToApprove.length === 0) {
      return;
    }

    startTransition(async () => {
      await Promise.all(
        assetIdsToApprove.map((assetId) =>
          fetch(`/api/campaign-assets/${assetId}/approve`, {
            method: "POST",
          })
        )
      );

      router.refresh();
    });
  }

  async function handleRemove(assetId: string) {
    startTransition(async () => {
      await fetch(`/api/campaign-assets/${assetId}/remove`, {
        method: "POST",
      });
      router.refresh();
    });
  }

  async function handleSaveEdit() {
  if (!editor) return;

  const asset = assets.find((item) => item.id === editor.assetId);
  if (!asset) return;

  const saved = buildSavedContentFromEditor(asset, editor);

  startTransition(async () => {
    await saveCampaignAssetEdit({
      campaignId,
      assetId: editor.assetId,
      title: saved.title,
      content: saved.content,
    });
    setEditor(null);
    router.refresh();
  });
}

  return (
    <section className="mf-card rounded-3xl p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
            {hasCommercialAssets
              ? "Commercial Pursuit Package"
              : "What Will Go Live"}
          </p>

          <h2 className="mt-1 text-xl font-bold tracking-tight text-gray-900">
            {hasCommercialAssets
              ? "Review the execution-ready materials"
              : "Review the launch-ready assets"}
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
            {hasCommercialAssets
              ? "Review each Commercial document, then approve, remove, or edit what should be included in the account pursuit."
              : "Review each platform, then approve, remove, or edit what should go live."}
          </p>
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
              Approval Required
            </p>
            <p className="mt-1 text-sm leading-6 text-amber-900">
              {hasCommercialAssets
                ? "Only approved materials are included in execution."
                : "Only approved platforms are available for execution."}
            </p>
          </div>
        </div>

                        <div className="flex flex-wrap items-center gap-2">
          {canEdit ? (
            <>
              <button
                type="button"
                disabled={isPending || pendingApprovalCount === 0}
                onClick={handleApproveAll}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pendingApprovalCount === 0
                  ? "All Approved"
                  : `Approve All${pendingApprovalCount > 0 ? ` (${pendingApprovalCount})` : ""}`}
              </button>

              <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                You can still edit before launch
              </span>
            </>
          ) : (
            <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
              Locked after launch
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-8">
  {hasCommercialAssets &&
  commercialInputSummary ? (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-800">
          Owner Input Required Before Launch
        </p>

        {commercialInputSummary
          .requiredBeforeLaunch
          .length > 0 ? (
          <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-950">
            {commercialInputSummary
              .requiredBeforeLaunch
              .map(
                (requirement) => (
                  <li
                    key={
                      requirement.key ??
                      requirement.label
                    }
                    className="flex gap-2"
                  >
                    <span aria-hidden="true">
                      •
                    </span>

                    <span>
                      <span className="font-semibold">
                        {requirement.label ??
                          formatAssetType(
                            requirement.key ??
                              "Owner input"
                          )}
                      </span>

                      {requirement.reason
                        ? ` — ${requirement.reason}`
                        : ""}
                    </span>
                  </li>
                )
              )}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-emerald-800">
            No owner-input requirements currently block launch.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-800">
          Owner Input Required Later
        </p>

        {commercialInputSummary
          .requiredLater.length >
        0 ? (
          <ul className="mt-3 space-y-2 text-sm leading-6 text-blue-950">
            {commercialInputSummary
              .requiredLater.map(
                (requirement) => (
                  <li
                    key={
                      requirement.key ??
                      requirement.label
                    }
                    className="flex gap-2"
                  >
                    <span aria-hidden="true">
                      •
                    </span>

                    <span>
                      <span className="font-semibold">
                        {requirement.label ??
                          formatAssetType(
                            requirement.key ??
                              "Owner input"
                          )}
                      </span>

                      {" — Needed before "}

                      {formatAssetType(
                        requirement.requiredBefore ??
                          "later execution"
                      )}
                    </span>
                  </li>
                )
              )}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-blue-800">
            No later owner-input requirements are recorded.
          </p>
        )}
      </div>
    </div>
  ) : null}

  {groupedAssets.map(
          (group) => (
            <div
              key={group.key}
              className="space-y-4"
            >
              <SectionHeading
                title={
                  group.label
                }
                subtitle={
                  group.subtitle
                }
              />

            {group.assets.map((asset) => {
            const isEditing =
              editor?.assetId ===
              asset.id;

            const commercialInput =
              getCommercialAssetInputSummary({
                asset,
                briefJson,
              });

            return (
                <div
                  id={
                    parseCommercialAssetMetadata(
                      asset
                    )
                      ? `commercial-asset-${asset.id}`
                      : undefined
                  }
                  key={asset.id}
                  className="scroll-mt-6 rounded-3xl border border-gray-200 bg-gray-50 p-4 md:p-5"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600">
                        {getAssetReviewLabel(
                          asset
                        )}
                      </p>
                      {asset.title ? (
                        <p className="text-lg font-semibold text-gray-900">
                          {asset.title}
                        </p>
                      ) : null}
                      <StatusBadge isApproved={asset.isApproved} />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {canEdit ? (
                        <>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleApprove(asset.id)}
                            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                          >
                            {asset.isApproved ? "Approved" : "Approve"}
                          </button>

                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleRemove(asset.id)}
                            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                          >
                            Remove
                          </button>

                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => {
                        const current = buildEditorContent(asset);
                        setEditor(current);
                      }}
                            className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200 disabled:opacity-60"
                          >
                            Edit
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {commercialInput &&
(
  commercialInput
    .requiredBeforeLaunch
    .length > 0 ||
  commercialInput
    .requiredLater
    .length > 0
) ? (
  <div className="mt-4 space-y-3">
    {commercialInput
      .requiredBeforeLaunch
      .length > 0 ? (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-800">
          Owner Input Required Before Launch
        </p>

        <ul className="mt-2 space-y-1 text-sm text-amber-950">
          {commercialInput
            .requiredBeforeLaunch
            .map(
              (requirement) => (
                <li
                  key={
                    requirement.key ??
                    requirement.label
                  }
                >
                  •{" "}
                  {requirement.label ??
                    formatAssetType(
                      requirement.key ??
                        "Owner input"
                    )}
                </li>
              )
            )}
        </ul>

        <p className="mt-2 text-xs text-amber-800">
          Use Edit to replace these placeholders before approving the action.
        </p>
      </div>
    ) : null}

    {commercialInput
      .requiredLater.length >
    0 ? (
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-800">
          Owner Input Required Later
        </p>

        <ul className="mt-2 space-y-1 text-sm text-blue-950">
          {commercialInput
            .requiredLater.map(
              (requirement) => (
                <li
                  key={
                    requirement.key ??
                    requirement.label
                  }
                >
                  •{" "}
                  {requirement.label ??
                    formatAssetType(
                      requirement.key ??
                        "Owner input"
                    )}{" "}
                  — before{" "}
                  {formatAssetType(
                    requirement.requiredBefore ??
                      "later execution"
                  )}
                </li>
              )
            )}
        </ul>

        <p className="mt-2 text-xs text-blue-800">
          These items do not prevent initial outreach.
        </p>
      </div>
    ) : null}
  </div>
) : null}

                  <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
                    <div className="min-w-0">
                      <AssetPreview
  asset={
    isEditing
      ? {
          ...asset,
          title: editor.title || null,
          content: editor.content,
        }
      : asset
  }
  logoUrl={logoUrl}
  businessName={businessName}
  websiteUrl={websiteUrl}
  industryLabel={industryLabel}
/>
                    </div>

                    <div className="min-w-0">
                      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-600">
                            Edit Asset
                          </p>
                        </div>

                        <div className="space-y-4 p-4">
                          {isEditing ? (
                            <>
                              {editor.structuredKind ? (
                                <StructuredAssetEditorFields
                                  editor={editor}
                                  setEditor={setEditor}
                                />
                              ) : (
                                <>
                                  <div>
                                    <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                                      Title
                                    </label>
                                    <input
                                      value={editor.title}
                                      disabled={isPending}
                                      onChange={(e) =>
                                        setEditor({
                                          ...editor,
                                          title: e.target.value,
                                        })
                                      }
                                      className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
                                    />
                                  </div>

                                  <div>
                                    <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                                      Content
                                    </label>
                                    <textarea
                                      value={editor.content}
                                      disabled={isPending}
                                      onChange={(e) =>
                                        setEditor({
                                          ...editor,
                                          content: e.target.value,
                                        })
                                      }
                                      rows={asset.assetType === "BLOG" ? 20 : 14}
                                      className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm leading-6 text-gray-800 disabled:bg-gray-100 disabled:text-gray-500"
                                    />
                                  </div>
                                </>
                              )}

                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={handleSaveEdit}
                                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                                >
                                  {isPending ? "Saving..." : "Save Changes"}
                                </button>

                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() => setEditor(null)}
                                  className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200 disabled:opacity-60"
                                >
                                  Cancel Editing
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm leading-6 text-blue-900">
                              Select <span className="font-semibold">Edit</span> to
                              update this asset before approval.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {assets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
            <p className="text-sm font-semibold text-gray-900">No assets yet</p>
            <p className="mt-2 text-sm text-gray-600">
              Launch assets will appear here once the action package is generated.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}