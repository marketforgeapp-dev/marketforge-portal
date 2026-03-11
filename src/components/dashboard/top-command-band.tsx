import Link from "next/link";
import { RevenueOpportunityHero } from "@/lib/revenue-opportunity-engine";
import { DashboardRecommendationCard } from "./recommended-campaigns-panel";

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
  recommendations: DashboardRecommendationCard[];
};

type CampaignBriefData = {
  campaignDraft?: {
    description?: string;
    offer?: string;
    audience?: string;
    cta?: string;
  };
  creativeGuidance?: {
    recommendedImage?: string;
    avoidImagery?: string;
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
  ];

  for (const type of preferredOrder) {
    const found = assets.find((asset) => asset.assetType === type);
    if (found) return found;
  }

  return assets[0] ?? null;
}

function fallbackPreview(hero: RevenueOpportunityHero) {
  return {
    title: `${hero.bestMove} ready to launch`,
    description:
      "MarketForge recommends moving now based on current demand, available capacity, and softer competitor activity.",
    offer: "Fast-response local service offer",
    cta: "Book now",
    imageDirection: `In-home service scene showing ${hero.bestMove.toLowerCase()} in progress in a real residential setting`,
  };
}

function extractPreviewLines(content: string) {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function RecommendationCreativeTile({
  title,
  offer,
}: {
  title: string;
  offer: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 p-4 text-white shadow-sm">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.22),transparent_40%)]" />
      <div className="relative flex h-full min-h-[155px] flex-col justify-between">
        <div>
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/90">
            Creative Preview
          </span>
          <p className="mt-3 max-w-[16rem] text-lg font-semibold leading-tight">
            {title}
          </p>
        </div>

        <div>
          <p className="text-sm text-white/80">{offer}</p>
          <div className="mt-3 inline-flex rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-900">
            Ready to Review
          </div>
        </div>
      </div>
    </div>
  );
}

export function TopCommandBand({
  hero,
  heroCampaign,
  recommendations,
}: Props) {
  const topRecommendations = recommendations.slice(0, 3);
  const brief = getBriefData(heroCampaign?.briefJson);
  const previewAsset = heroCampaign ? getPreviewAsset(heroCampaign.assets) : null;
  const fallback = fallbackPreview(hero);

  const previewTitle = heroCampaign?.name ?? fallback.title;
  const previewDescription =
    brief?.campaignDraft?.description ?? fallback.description;
  const previewOffer =
    heroCampaign?.offer ?? brief?.campaignDraft?.offer ?? fallback.offer;
  const previewAudience =
    heroCampaign?.audience ?? brief?.campaignDraft?.audience ?? "Local homeowners";
  const previewCta = brief?.campaignDraft?.cta ?? fallback.cta;
  const imageDirection =
    brief?.creativeGuidance?.recommendedImage ?? fallback.imageDirection;

  const previewLines = previewAsset
    ? extractPreviewLines(previewAsset.content)
    : [
        "Launch-ready channel copy prepared",
        "Offer and CTA included",
        "Ready for operator review",
      ];

  return (
    <section className="space-y-5">
      <section className="mf-card mf-card-highlight rounded-3xl p-5">
        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#B07A12]">
                Primary Opportunity
              </p>

              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
                {hero.confidenceScore}% {hero.confidenceLabel}
              </span>

              <span className="text-xs font-medium text-gray-600">
                High confidence and immediate upside this week
              </span>
            </div>

            <div>
              <p className="text-3xl font-bold tracking-tight text-gray-900">
                {hero.opportunityTitle}
              </p>

              <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="text-3xl font-bold tracking-tight text-gray-900">
                  {hero.jobsLow}–{hero.jobsHigh} Jobs
                </p>

                <p className="text-lg font-semibold text-gray-700">
                  • ${hero.revenueLow.toLocaleString()}–$
                  {hero.revenueHigh.toLocaleString()} revenue
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Learning Signal
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {hero.performanceLabel} Signal
                {hero.historicalCampaignCount > 0
                  ? ` • Based on ${hero.historicalCampaignCount} past campaign${hero.historicalCampaignCount === 1 ? "" : "s"}`
                  : ""}
              </p>
              <p className="mt-1 text-sm leading-6 text-gray-700">
                {hero.performanceDetail}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                CEO Summary
              </p>

              <p className="mt-2 text-sm leading-6 text-gray-700">
                Demand appears favorable, capacity looks available, and this is one
                of the better near-term revenue opportunities in the account.
              </p>

              <p className="mt-3 text-sm leading-6 text-gray-700">
                {hero.whyNowBullets.slice(0, 3).join(" • ")}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold text-gray-700">
                  Capacity Fit: {hero.capacityFit}
                </span>

                <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold text-gray-700">
                  Sources: {hero.sourceTags.join(" • ")}
                </span>
              </div>
            </div>

            <Link
              href={heroCampaign ? `/campaigns/${heroCampaign.id}` : "/campaigns"}
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Review Campaign
            </Link>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                Ad Preview
              </p>

              <div className="mt-3 overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 shadow-sm">
                <div className="relative aspect-[4/3] p-4 text-white">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.24),transparent_40%)]" />

                  <div className="relative flex h-full flex-col justify-between">
                    <div>
                      <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/90">
                        Suggested Asset
                      </span>
                      <p className="mt-3 max-w-[16rem] text-xl font-semibold leading-tight">
                        {previewTitle}
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

                      <div className="pt-2">
                        <span className="inline-flex rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-900">
                          {previewCta}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">
                    Offer
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {previewOffer}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">
                    Audience
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {previewAudience}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">
                    CTA
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {previewCta}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                Image Direction
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-700">
                {imageDirection}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                Asset Summary
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-700">
                {previewDescription}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mf-card rounded-3xl p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
              Recommended Campaigns
            </p>
            <p className="mt-1 text-sm text-gray-600">
              Ranked next-best moves based on current opportunity signals.
            </p>
          </div>

          <Link
            href="/campaigns"
            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            View All
          </Link>
        </div>

        <div className="mt-4 space-y-3">
          {topRecommendations.map((recommendation) => (
            <div key={recommendation.id} className="mf-card rounded-2xl p-4">
              <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                <RecommendationCreativeTile
                  title={recommendation.title}
                  offer={`${recommendation.estimatedBookedJobsMin ?? 0}–${recommendation.estimatedBookedJobsMax ?? 0} jobs • $${recommendation.estimatedRevenueMin.toLocaleString()}–$${recommendation.estimatedRevenueMax.toLocaleString()}`}
                />

                <div className="flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="text-base font-semibold text-gray-900">
                        {recommendation.title}
                      </p>

                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {recommendation.score.toFixed(1)}
                      </span>
                    </div>

                    <p className="mt-1.5 text-sm leading-6 text-gray-600">
                      {recommendation.description ?? "No description available."}
                    </p>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-xl bg-white p-3">
                        <p className="text-[11px] text-gray-600">Revenue</p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">
                          ${recommendation.estimatedRevenueMin.toLocaleString()}–$
                          {recommendation.estimatedRevenueMax.toLocaleString()}
                        </p>
                      </div>

                      <div className="rounded-xl bg-white p-3">
                        <p className="text-[11px] text-gray-600">Jobs</p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">
                          {recommendation.estimatedBookedJobsMin ?? 0}–
                          {recommendation.estimatedBookedJobsMax ?? 0}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    {recommendation.linkedCampaignId ? (
                      <Link
                        href={`/campaigns/${recommendation.linkedCampaignId}`}
                        className="inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        Review Campaign
                      </Link>
                    ) : (
                      <Link
                        href="/campaigns"
                        className="inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        Generate Campaign
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}