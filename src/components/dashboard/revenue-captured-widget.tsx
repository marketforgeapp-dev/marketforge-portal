type RevenueCapturedEntry = {
  campaignName: string;
  jobsGenerated: number;
  revenue: number;
};

type Props = {
  totalRevenue: number;
  bookedJobs: number;
  campaignsLaunched: number;
  winRate: number;
  entries: RevenueCapturedEntry[];
};

export function RevenueCapturedWidget({
  totalRevenue,
  bookedJobs,
  campaignsLaunched,
  winRate,
  entries,
}: Props) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
            Revenue Captured Using MarketForge
          </p>

          <h2 className="mt-2 text-4xl font-bold tracking-tight text-gray-900">
            ${totalRevenue.toLocaleString()}
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-6 text-gray-600">
            Attributed revenue from MarketForge campaigns based on recorded
            campaign performance results.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-xs text-gray-600">Attributed Jobs</p>
            <p className="mt-2 text-lg font-semibold text-gray-900">
              {bookedJobs}
            </p>
          </div>

          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-xs text-gray-600">Campaigns With Results</p>
            <p className="mt-2 text-lg font-semibold text-gray-900">
              {campaignsLaunched}
            </p>
          </div>

          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-xs text-gray-600">Lead-to-Job Rate</p>
            <p className="mt-2 text-lg font-semibold text-gray-900">
              {winRate}%
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {entries.map((entry) => (
          <div
            key={entry.campaignName}
            className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50 p-4 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {entry.campaignName}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                Attributed Jobs: {entry.jobsGenerated}
              </p>
            </div>

            <p className="text-sm font-semibold text-emerald-700">
              Revenue: ${entry.revenue.toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}