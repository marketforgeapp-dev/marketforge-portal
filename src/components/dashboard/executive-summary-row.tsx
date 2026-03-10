type Props = {
  activeOpportunities: number;
  queuedForLaunch: number;
  attributedJobs: number;
  leadToJobRate: number;
};

export function ExecutiveSummaryRow({
  activeOpportunities,
  queuedForLaunch,
  attributedJobs,
  leadToJobRate,
}: Props) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
          Active Opportunities
        </p>
        <p className="mt-3 text-2xl font-bold tracking-tight text-gray-900">
          {activeOpportunities}
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
          Queued for Launch
        </p>
        <p className="mt-3 text-2xl font-bold tracking-tight text-gray-900">
          {queuedForLaunch}
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
          Attributed Jobs
        </p>
        <p className="mt-3 text-2xl font-bold tracking-tight text-gray-900">
          {attributedJobs}
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
          Lead-to-Job Rate
        </p>
        <p className="mt-3 text-2xl font-bold tracking-tight text-gray-900">
          {leadToJobRate}%
        </p>
      </div>
    </section>
  );
}