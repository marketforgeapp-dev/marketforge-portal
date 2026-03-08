import { RevenueOpportunity } from "@prisma/client";

type Props = {
  opportunity: RevenueOpportunity;
};

export function MissedRevenueCard({ opportunity }: Props) {
  const revenueMax = opportunity.estimatedRevenueMax
    ? Number(opportunity.estimatedRevenueMax)
    : 0;

  const revenueMin = opportunity.estimatedRevenueMin
    ? Number(opportunity.estimatedRevenueMin)
    : 0;

  const jobsMin = opportunity.estimatedBookedJobsMin ?? 0;
  const jobsMax = opportunity.estimatedBookedJobsMax ?? 0;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            Missed Revenue This Week
          </p>

          <div className="mt-3 flex items-end gap-3">
            <h2 className="text-4xl font-bold tracking-tight text-gray-900">
              ${revenueMax.toLocaleString()}
            </h2>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
              High urgency
            </span>
          </div>

          <div className="mt-6">
            <p className="text-sm font-semibold text-gray-900">Why this exists</p>
            <ul className="mt-3 space-y-2 text-sm text-gray-700">
              {opportunity.whyNow.map((reason) => (
                <li key={reason}>• {reason}</li>
              ))}
            </ul>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-500">Best move</p>
              <p className="mt-2 text-lg font-semibold text-gray-900">
                {opportunity.title}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-500">Expected Impact</p>
              <p className="mt-2 text-lg font-semibold text-gray-900">
                {jobsMin}–{jobsMax} jobs
              </p>
              <p className="mt-1 text-sm text-gray-600">
                ${revenueMin.toLocaleString()}–${revenueMax.toLocaleString()} revenue
              </p>
            </div>
          </div>
        </div>

        <div className="xl:w-72">
          <button
            type="button"
            className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Launch Campaign
          </button>

          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-semibold text-blue-900">Why This Matters</p>
            <p className="mt-2 text-sm leading-6 text-blue-900/90">
              Search demand for drain cleaning increased in Jasper and Canton this
              week. Two nearby competitors have not promoted drain cleaning
              services recently. Based on your technician capacity, your business
              could likely handle 4–6 additional jobs this week.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}