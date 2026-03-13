import Link from "next/link";
import { RevenueOpportunityHero } from "@/lib/revenue-opportunity-engine";

type HeroCampaignData = {
  id: string;
  name: string;
  status: string;
  targetService: string | null;
  offer: string | null;
  audience: string | null;
  briefJson: unknown;
  assets: {
    id: string;
    assetType: string;
    title: string | null;
    content: string;
  }[];
} | null;

type Props = {
  hero: RevenueOpportunityHero;
  heroCampaign: HeroCampaignData;
};

type CampaignBriefData = {
  campaignDraft?: {
    description?: string;
    offer?: string;
    audience?: string;
    cta?: string;
  };
};

function getBriefData(raw: unknown): CampaignBriefData | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as CampaignBriefData;
}

function getPreviewAsset(
  assets: { assetType: string; title: string | null; content: string }[]
) {
  const preferredOrder = [
    "GOOGLE_BUSINESS",
    "META",
    "GOOGLE_ADS",
    "YELP",
    "EMAIL",
    "BLOG",
    "FAQ",
  ];

  for (const type of preferredOrder) {
    const found = assets.find((asset) => asset.assetType === type);
    if (found) return found;
  }

  return assets[0] ?? null;
}

function extractPreviewLines(content: string) {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function formatCurrencyRange(low: number, high: number) {
  return `$${low.toLocaleString()}–$${high.toLocaleString()}`;
}

function formatActionFraming(value: string) {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getActionStatusMeta(heroCampaign: HeroCampaignData) {
  if (!heroCampaign) {
    return {
      badge: "Not Generated",
      summary: "Generate this action to create the execution package.",
      ctaLabel: "Generate Action",
      href: "/campaigns",
    };
  }

  switch (heroCampaign.status) {
    case "DRAFT":
      return {
        badge: "Draft Ready",
        summary: "Assets are prepared and ready for review.",
        ctaLabel: "Review Action",
        href: `/campaigns/${heroCampaign.id}`,
      };
    case "APPROVED":
      return {
        badge: "Approved",
        summary: "Approved and ready for execution.",
        ctaLabel: "Open Action",
        href: `/campaigns/${heroCampaign.id}`,
      };
    case "SCHEDULED":
      return {
        badge: "Queued",
        summary: "Queued for launch.",
        ctaLabel: "Open Execution",
        href: `/campaigns/${heroCampaign.id}`,
      };
    case "LAUNCHED":
      return {
        badge: "Launched",
        summary: "Live and being tracked.",
        ctaLabel: "Open Execution",
        href: `/campaigns/${heroCampaign.id}`,
      };
    case "COMPLETED":
      return {
        badge: "Completed",
        summary: "Execution completed.",
        ctaLabel: "View Details",
        href: `/campaigns/${heroCampaign.id}`,
      };
    default:
      return {
        badge: heroCampaign.status,
        summary: "Execution materials are attached.",
        ctaLabel: "Open Action",
        href: `/campaigns/${heroCampaign.id}`,
      };
  }
}

export function TopCommandBand({ hero, heroCampaign }: Props) {
  const brief = getBriefData(heroCampaign?.briefJson);
  const previewAsset = heroCampaign ? getPreviewAsset(heroCampaign.assets) : null;
  const statusMeta = getActionStatusMeta(heroCampaign);

  const preparedAssets = heroCampaign?.assets ?? [];

  const previewLines = previewAsset
    ? extractPreviewLines(previewAsset.content)
    : [
        "Top-priority action identified",
        "Execution package ready to generate",
        "Prepared work will move into launch",
      ];

  const offerText =
    heroCampaign?.offer ??
    brief?.campaignDraft?.offer ??
    "Offer will populate when the action package is generated.";

  const audienceText =
    heroCampaign?.audience ??
    brief?.campaignDraft?.audience ??
    "Audience guidance will populate when the action package is generated.";

  const ctaText = brief?.campaignDraft?.cta ?? "Book now";

  return (
    <section className="mf-card mf-card-highlight rounded-3xl p-4 md:p-5">
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B07A12]">
              Top Priority Action
            </p>

            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
              {hero.confidenceScore}% {hero.confidenceLabel}
            </span>

            <span className="rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-semibold text-gray-700">
              {statusMeta.badge}
            </span>
          </div>

          <div>
            <p className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
              {hero.opportunityTitle}
            </p>

            <p className="mt-1.5 text-base font-semibold text-gray-800 md:text-lg">
              {hero.bestMove}
            </p>

            <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
                {hero.jobsLow}–{hero.jobsHigh} Jobs
              </p>

              <p className="text-base font-semibold text-gray-700">
                • {formatCurrencyRange(hero.revenueLow, hero.revenueHigh)}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
              Why Now
            </p>

            <ul className="mt-2 space-y-1.5 text-sm leading-5 text-gray-800">
              {hero.whyNowBullets.slice(0, 3).map((bullet) => (
                <li key={bullet} className="flex gap-2">
                  <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                Urgency
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {hero.urgencyRelevance}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                Intent
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {hero.homeownerIntentStrength}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                Capacity
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {hero.capacityFit}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                Open Capacity
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                ~{hero.availableJobsEstimate}/week
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-3.5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Action Type
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {formatActionFraming(hero.actionFraming)}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Signals
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {hero.sourceTags.join(" • ")}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={statusMeta.href}
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {statusMeta.ctaLabel}
            </Link>

            <Link
              href="/execution"
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Open Execution
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                Execution Package
              </p>

              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-semibold text-gray-700">
                {preparedAssets.length} assets
              </span>
            </div>

            <div className="mt-3 overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 shadow-sm">
              <div className="relative aspect-[4/3] p-4 text-white">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.24),transparent_40%)]" />

                <div className="relative flex h-full flex-col justify-between">
                  <div>
                    <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/90">
                      Launch-Ready
                    </span>
                    <p className="mt-3 max-w-[16rem] text-lg font-semibold leading-tight">
                      {heroCampaign?.name ?? hero.bestMove}
                    </p>
                  </div>

                  <div className="space-y-2">
                    {previewLines.map((line) => (
                      <p
                        key={line}
                        className="max-w-[17rem] text-sm leading-5 text-white/85"
                      >
                        {line}
                      </p>
                    ))}

                    <div className="pt-1">
                      <span className="inline-flex rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-900">
                        {heroCampaign ? ctaText : "Ready to Generate"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-[10px] uppercase tracking-wide text-gray-500">
                  Offer
                </p>
                <p className="mt-1 text-sm font-medium text-gray-900">
                  {offerText}
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-[10px] uppercase tracking-wide text-gray-500">
                  Audience
                </p>
                <p className="mt-1 text-sm font-medium text-gray-900">
                  {audienceText}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3.5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
              Action Readiness
            </p>
            <p className="mt-1.5 text-sm leading-5 text-gray-700">
              {statusMeta.summary}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3.5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
              Intelligence Readout
            </p>
            <div className="mt-2 space-y-1.5 text-sm leading-5 text-gray-700">
              <p>{hero.seasonalityReason}</p>
              <p>{hero.homeownerIntentReason}</p>
              <p>{hero.actionFramingReason}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}