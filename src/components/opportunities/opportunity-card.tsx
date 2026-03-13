import { RevenueOpportunity } from "@/generated/prisma";

type OpportunityCardProps = {
  opportunity: RevenueOpportunity;
};

export function OpportunityCard({ opportunity }: OpportunityCardProps) {
  const revenueMin = opportunity.estimatedRevenueMin
    ? Number(opportunity.estimatedRevenueMin)
    : 0;

  const revenueMax = opportunity.estimatedRevenueMax
    ? Number(opportunity.estimatedRevenueMax)
    : 0;

  const jobsMin = opportunity.estimatedBookedJobsMin ?? 0;
  const jobsMax = opportunity.estimatedBookedJobsMax ?? 0;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            {opportunity.opportunityType.replaceAll("_", " ")}
          </p>
          <h3 className="mt-2 text-lg font-bold text-gray-900">
            {opportunity.title}
          </h3>
        </div>

        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
          {opportunity.confidence ?? "N/A"} confidence
        </span>
      </div>

      {opportunity.description ? (
        <p className="mt-3 text-sm leading-6 text-gray-600">
          {opportunity.description}
        </p>
      ) : null}

      <div className="mt-4 space-y-2">
        <p className="text-sm font-semibold text-gray-900">Why now</p>
        <ul className="space-y-1 text-sm text-gray-700">
          {opportunity.whyNow.map((reason) => (
            <li key={reason}>• {reason}</li>
          ))}
        </ul>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-medium text-gray-500">Revenue Range</p>
          <p className="mt-2 text-base font-semibold text-gray-900">
            ${revenueMin.toLocaleString()}–${revenueMax.toLocaleString()}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-medium text-gray-500">Expected Jobs</p>
          <p className="mt-2 text-base font-semibold text-gray-900">
            {jobsMin}–{jobsMax}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
          Capacity fit: {opportunity.capacityFit ?? "N/A"}
        </span>

        <button
          type="button"
          className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
        >
          View Opportunity
        </button>
      </div>
    </div>
  );
}