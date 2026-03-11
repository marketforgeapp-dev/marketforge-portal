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

function KpiCard({
  label,
  value,
  subtext,
  accent = "gold",
}: {
  label: string;
  value: string;
  subtext: string;
  accent?: "gold" | "emerald" | "blue" | "slate";
}) {
  const accentClasses =
    accent === "gold"
      ? "border-t-[#F5B942]"
      : accent === "emerald"
        ? "border-t-[#1ED18A]"
        : accent === "blue"
          ? "border-t-[#3B82F6]"
          : "border-t-[#64748B]";

  return (
    <div
      className={`mf-card rounded-2xl border-t-4 ${accentClasses} p-4`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-gray-600">{subtext}</p>
    </div>
  );
}

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
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <KpiCard
        label="Jobs Available This Week"
        value={`${jobsLow}–${jobsHigh}`}
        subtext="Estimated jobs available across your current top opportunities."
        accent="gold"
      />

      <KpiCard
        label="Revenue Opportunity"
        value={`$${revenueOpportunityLow.toLocaleString()}–$${revenueOpportunityHigh.toLocaleString()}`}
        subtext="Estimated revenue available if you act on the strongest signals now."
        accent="gold"
      />

      <KpiCard
        label="Revenue Captured by MarketForge"
        value={`$${revenueCapturedYtd.toLocaleString()}`}
        subtext={`${attributedJobs} booked jobs • ${leadToJobRate}% lead-to-job rate`}
        accent="emerald"
      />

      <KpiCard
        label="Active Opportunities"
        value={`${activeOpportunities}`}
        subtext={`${queuedForLaunch} campaign${queuedForLaunch === 1 ? "" : "s"} queued for managed launch`}
        accent="blue"
      />

      <KpiCard
        label="Average ROI Signal"
        value={roi > 0 ? `${roi.toFixed(1)}x` : "—"}
        subtext="Early ROI view based on launched campaign performance data."
        accent="slate"
      />
    </section>
  );
}