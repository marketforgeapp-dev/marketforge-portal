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
  monthlyBudget: number;
  allocatedBudget: number;
  remainingBudget: number;
};

function formatCurrency(value: number) {
  return `$${value.toLocaleString()}`;
}

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

function BudgetStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
        {label}
      </p>
      <p className="mt-2 text-xl font-bold tracking-tight text-gray-900">
        {value}
      </p>
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
  monthlyBudget,
  allocatedBudget,
  remainingBudget,
}: Props) {
  return (
    <div className="space-y-4">
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

      <section className="mf-card rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-700">
              Monthly Budget Status
            </p>
            <h2 className="mt-1 text-lg font-bold tracking-tight text-gray-900">
              Budget available for actions this month
            </h2>
            <p className="mt-1 text-sm text-gray-700">
              MarketForge uses your monthly budget, current action commitments,
              and remaining budget to guide what should move forward next.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <BudgetStat
            label="Monthly Budget"
            value={formatCurrency(monthlyBudget)}
          />
          <BudgetStat
            label="Allocated This Month"
            value={formatCurrency(allocatedBudget)}
          />
          <BudgetStat
            label="Remaining Budget"
            value={formatCurrency(remainingBudget)}
          />
        </div>
      </section>
    </div>
  );
}