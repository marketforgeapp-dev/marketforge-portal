import Link from "next/link";
import { RevenueOpportunityEngineResult } from "@/lib/revenue-opportunity-engine";

type BaseOpportunityCardData =
  RevenueOpportunityEngineResult["rankedOpportunities"][number];

export type OpportunityCardData = BaseOpportunityCardData & {
  linkedCampaignId?: string | null;
};

type Props = {
  opportunities: OpportunityCardData[];
};

function getCreativeTheme(opportunityType: OpportunityCardData["opportunityType"]) {
  switch (opportunityType) {
    case "SEASONAL_DEMAND":
      return {
        label: "Seasonal Demand",
        classes:
          "from-sky-900 via-blue-800 to-cyan-700",
      };
    case "HIGH_VALUE_SERVICE":
      return {
        label: "High-Value Service",
        classes:
          "from-amber-900 via-orange-800 to-yellow-700",
      };
    case "AI_SEARCH_VISIBILITY":
      return {
        label: "AEO / Visibility",
        classes:
          "from-violet-900 via-fuchsia-800 to-indigo-700",
      };
    case "CAPACITY_GAP":
      return {
        label: "Capacity Fill",
        classes:
          "from-emerald-900 via-green-800 to-teal-700",
      };
    case "COMPETITOR_INACTIVE":
      return {
        label: "Competitor Gap",
        classes:
          "from-rose-900 via-red-800 to-orange-700",
      };
    default:
      return {
        label: "Local Opportunity",
        classes:
          "from-slate-800 via-slate-700 to-slate-900",
      };
  }
}

function OpportunityCreativeTile({
  title,
  bestMove,
  jobsLow,
  jobsHigh,
  revenueLow,
  revenueHigh,
  opportunityType,
}: {
  title: string;
  bestMove: string;
  jobsLow: number;
  jobsHigh: number;
  revenueLow: number;
  revenueHigh: number;
  opportunityType: OpportunityCardData["opportunityType"];
}) {
  const theme = getCreativeTheme(opportunityType);

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br ${theme.classes} p-4 text-white shadow-sm`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.12),transparent_40%)]" />
      <div className="relative flex min-h-[190px] flex-col justify-between">
        <div>
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/90">
            {theme.label}
          </span>
          <p className="mt-3 max-w-[16rem] text-lg font-semibold leading-tight">
            {title}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-white/90">{bestMove}</p>
          <p className="text-sm text-white/80">
            {jobsLow}–{jobsHigh} jobs • ${revenueLow.toLocaleString()}–$
            {revenueHigh.toLocaleString()}
          </p>
          <div className="pt-1">
            <span className="inline-flex rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-900">
              Intelligence-Driven
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OpportunitiesGrid({ opportunities }: Props) {
  return (
    <div className="grid gap-4">
      {opportunities.map((opportunity) => (
        <div
          key={opportunity.title}
          className="mf-card mf-card-success rounded-xl p-4"
        >
          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <OpportunityCreativeTile
              title={opportunity.title}
              bestMove={opportunity.bestMove}
              jobsLow={opportunity.jobsLow}
              jobsHigh={opportunity.jobsHigh}
              revenueLow={opportunity.revenueLow}
              revenueHigh={opportunity.revenueHigh}
              opportunityType={opportunity.opportunityType}
            />

            <div className="flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-base font-semibold text-gray-900">
                      {opportunity.title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-gray-600">
                      {opportunity.whyThisMatters}
                    </p>
                  </div>

                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {opportunity.confidenceLabel}
                  </span>
                </div>

                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                    Learning Signal
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {opportunity.performanceLabel} Signal
                    {opportunity.historicalCampaignCount > 0
                      ? ` • ${opportunity.historicalCampaignCount} past campaign${opportunity.historicalCampaignCount === 1 ? "" : "s"}`
                      : ""}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-gray-700">
                    {opportunity.performanceDetail}
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-white p-3">
                    <p className="text-xs text-gray-600">Jobs</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {opportunity.jobsLow}–{opportunity.jobsHigh}
                    </p>
                  </div>

                  <div className="rounded-lg bg-white p-3">
                    <p className="text-xs text-gray-600">Revenue</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      ${opportunity.revenueLow.toLocaleString()}–$
                      {opportunity.revenueHigh.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-lg bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Recommended Action
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {opportunity.bestMove}
                  </p>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Why Now
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-gray-700">
                    {opportunity.whyNowBullets.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {opportunity.sourceTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                {opportunity.linkedCampaignId ? (
                  <Link
                    href={`/campaigns/${opportunity.linkedCampaignId}`}
                    className="inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Review Campaign
                  </Link>
                ) : (
                  <Link
                    href="/campaigns"
                    className="inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Create Campaign
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}