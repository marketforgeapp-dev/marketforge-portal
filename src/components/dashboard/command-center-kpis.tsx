type Props = {
  jobsLow: number;
  jobsHigh: number;
  revenueOpportunityLow: number;
  revenueOpportunityHigh: number;
  topActionRevenueLow: number;
  topActionRevenueHigh: number;
  revenueCapturedYtd: number;
  attributedJobs: number;
  leadToJobRate: number;
};

function KpiCard({
  label,
  value,
  subtext,
  detail,
  accent = "gold",
}: {
  label: string;
  value: string;
  subtext: string;
  detail: string;
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
    <div className={`mf-card rounded-2xl border-t-4 ${accentClasses} p-4`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
        {value}
      </p>
      <p className="mt-1.5 text-sm font-medium leading-5 text-gray-700">
        {subtext}
      </p>
      <p className="mt-1 text-xs leading-5 text-gray-500">{detail}</p>
    </div>
  );
}

export function CommandCenterKpis({
  jobsLow,
  jobsHigh,
  revenueOpportunityLow,
  revenueOpportunityHigh,
  topActionRevenueLow,
  topActionRevenueHigh,
  revenueCapturedYtd,
  attributedJobs,
  leadToJobRate,
}: Props) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Weekly Revenue Opportunity"
        value={`$${revenueOpportunityLow.toLocaleString()}–$${revenueOpportunityHigh.toLocaleString()}`}
        subtext="Current ranked action set"
        detail="Estimated total value across the opportunities MarketForge is tracking right now."
        accent="gold"
      />

      <KpiCard
        label="Available Jobs This Week"
        value={`${jobsLow}–${jobsHigh}`}
        subtext="Bookable near-term capacity"
        detail="Estimated jobs available if you act on current demand, capacity, and visibility signals."
        accent="gold"
      />

      <KpiCard
        label="Top Action Value"
        value={`$${topActionRevenueLow.toLocaleString()}–$${topActionRevenueHigh.toLocaleString()}`}
        subtext="Highest-priority move"
        detail="Estimated value of the single action MarketForge recommends you take next."
        accent="blue"
      />

      <KpiCard
        label="Revenue Captured"
        value={`$${revenueCapturedYtd.toLocaleString()}`}
        subtext={`${attributedJobs} booked jobs`}
        detail={`${leadToJobRate}% lead-to-job rate from launched actions tracked in the workspace.`}
        accent="emerald"
      />
    </section>
  );
}