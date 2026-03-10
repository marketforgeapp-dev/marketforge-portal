import { RevenueOpportunityEngineResult } from "@/lib/revenue-opportunity-engine";

export type OpportunityCardData =
  RevenueOpportunityEngineResult["rankedOpportunities"][number];

type Props = {
  opportunities: OpportunityCardData[];
};

export function OpportunitiesGrid({ opportunities }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {opportunities.map((opportunity) => (
        <div
          key={opportunity.title}
          className="rounded-xl border border-gray-200 bg-gray-50 p-4"
        >
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
        </div>
      ))}
    </div>
  );
}