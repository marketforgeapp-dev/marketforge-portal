type Props = {
  jobsLow: number;
  jobsHigh: number;
  revenueOpportunityLow: number;
  revenueOpportunityHigh: number;
  revenueCapturedYtd: number;
  roi: number;
  activeOpportunities: number;
  queuedForLaunch: number;
  attributedJobs: number;
  leadToJobRate: number;
};

export function CommandCenterKpis({
  jobsLow,
  jobsHigh,
  revenueOpportunityLow,
  revenueOpportunityHigh,
  revenueCapturedYtd,
  roi,
  activeOpportunities,
  queuedForLaunch,
  attributedJobs,
  leadToJobRate,
}: Props) {
  return (
    <section className="space-y-4">

      {/* Row 1 — Opportunity */}

      <div className="grid gap-4 md:grid-cols-2">

        <div className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Jobs You Can Capture This Week
          </p>

          <p className="mt-3 text-4xl font-bold tracking-tight text-gray-900">
            {jobsLow}–{jobsHigh}
          </p>

          <p className="mt-2 text-sm text-gray-600">
            Estimated from demand, competitor, and capacity signals
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
            Revenue Opportunity
          </p>

          <p className="mt-3 text-4xl font-bold tracking-tight text-gray-900">
            ${revenueOpportunityLow.toLocaleString()}–$
            {revenueOpportunityHigh.toLocaleString()}
          </p>

          <p className="mt-2 text-sm text-gray-600">
            Estimated opportunity this week
          </p>
        </div>

      </div>

      {/* Row 2 — Performance metrics */}

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
            Revenue Captured YTD
          </p>
          <p className="mt-2 text-xl font-bold text-gray-900">
            ${revenueCapturedYtd.toLocaleString()}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
            ROI
          </p>
          <p className="mt-2 text-xl font-bold text-gray-900">
            {roi.toFixed(1)}x
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
            Active Opportunities
          </p>
          <p className="mt-2 text-xl font-bold text-gray-900">
            {activeOpportunities}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
            Queued for Launch
          </p>
          <p className="mt-2 text-xl font-bold text-gray-900">
            {queuedForLaunch}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
            Attributed Jobs
          </p>
          <p className="mt-2 text-xl font-bold text-gray-900">
            {attributedJobs}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
            Lead-to-Job Rate
          </p>
          <p className="mt-2 text-xl font-bold text-gray-900">
            {leadToJobRate}%
          </p>
        </div>

      </div>

    </section>
  );
}