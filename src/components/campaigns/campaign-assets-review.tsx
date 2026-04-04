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

function formatAssetType(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
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

function groupAssetsForReview(assets: CampaignAsset[]) {
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

  const buckets = orderedTypes
    .map((type) => ({
      type,
      assets: assets.filter((asset) => asset.assetType === type),
    }))
    .filter((bucket) => bucket.assets.length > 0);

  const remaining = assets.filter(
    (asset) => !orderedTypes.includes(asset.assetType)
  );

  if (remaining.length > 0) {
    buckets.push({
      type: "OTHER",
      assets: remaining,
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
      {isApproved ? "Approved for Launch" : "Needs Review"}
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

function GoogleBusinessPreview({
  payload,
  logoUrl,
  businessName,
  industryLabel,
}: {
  payload: GoogleBusinessAssetPayload;
  logoUrl?: string | null;
  businessName?: string | null;
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
}: {
  payload: MetaAssetPayload;
  logoUrl?: string | null;
  businessName?: string | null;
  websiteUrl?: string | null;
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
}: {
  payload: MetaAssetPayload;
  logoUrl?: string | null;
  businessName?: string | null;
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
}: {
  title: string | null;
  content: string;
}) {
  return (
    <PlatformShell label="Google Ads Search Preview">
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <p className="text-xs text-gray-500">Ad • business.com</p>
        <p className="mt-2 text-lg font-medium text-[#1a0dab]">
          {title || "Local Service Near You"} | Book Today | Fast Response
        </p>
        <p className="mt-2 text-sm leading-6 text-gray-800">
          {content || "Google Ads copy preview will appear here."}
        </p>
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
  const structured = parseStructuredAsset(asset);

  if (asset.assetType === "GOOGLE_BUSINESS" && structured?.kind === "GOOGLE_BUSINESS") {
    return (
  <GoogleBusinessPreview
    payload={structured}
    logoUrl={logoUrl}
    businessName={businessName}
    industryLabel={industryLabel}
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
/>
<InstagramPreview
  payload={structured}
  logoUrl={logoUrl}
  businessName={businessName}
  industryLabel={industryLabel}
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
  logoUrl,
  businessName,
  websiteUrl,
  industryLabel,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editor, setEditor] = useState<AssetEditorState | null>(null);

  const canEdit = status !== "LAUNCHED" && status !== "COMPLETED";
  const groupedAssets = useMemo(() => groupAssetsForReview(assets), [assets]);

  async function handleApprove(assetId: string) {
    startTransition(async () => {
      await fetch(`/api/campaign-assets/${assetId}/approve`, {
        method: "POST",
      });
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
            Launch Asset Review
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-gray-900">
            Review exactly what will go live
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
            Approve, remove, or edit each channel while viewing a high-fidelity
            preview of what the customer is actually approving.
          </p>
                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
              Approval Required for Execution
            </p>
            <p className="mt-1 text-sm leading-6 text-amber-900">
              Approve or remove every platform before moving this action into execution.
              Only approved platforms become executable and only approved platform assets
              are included in export packs.
            </p>
          </div>
        </div>

        {canEdit ? (
          <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            Editing available before launch
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
            Locked after launch
          </span>
        )}
      </div>

      <div className="mt-6 space-y-8">
        {groupedAssets.map((group) => (
          <div key={group.type} className="space-y-4">
            <SectionHeading
              title={formatAssetType(group.type)}
              subtitle={
                group.type === "META"
                  ? "One approved Meta asset is previewed as both Facebook and Instagram."
                  : "Approve only what you want included in execution and export."
              }
            />

            {group.assets.map((asset) => {
              const isEditing = editor?.assetId === asset.id;

              return (
                <div
                  key={asset.id}
                  className="rounded-3xl border border-gray-200 bg-gray-50 p-4 md:p-5"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600">
                        {formatAssetType(asset.assetType)}
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
                            {asset.isApproved ? "Re-Approve" : "Approve"}
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
                            Edit Approved Launch Content
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
                              update the actual launch content while keeping the
                              live-style preview visible beside the editor.
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