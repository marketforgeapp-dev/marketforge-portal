import { RevenueOpportunity } from "@prisma/client";
import { DashboardHeader } from "./dashboard-header";
import { DashboardSidebar } from "./dashboard-sidebar";
import { KpiRow } from "./kpi-row";
import { MissedRevenueCard } from "./missed-revenue-card";
import { RightRail } from "./right-rail";
import { OpportunitiesGrid } from "@/components/opportunities/opportunities-grid";

type DashboardShellProps = {
  workspaceName: string;
  opportunity: RevenueOpportunity;
  opportunities: RevenueOpportunity[];
};

export function DashboardShell({
  workspaceName,
  opportunity,
  opportunities,
}: DashboardShellProps) {
  const supportingOpportunities = opportunities.filter(
    (item) => item.id !== opportunity.id
  );

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row">
        <DashboardSidebar />

        <main className="flex-1 space-y-6">
          <DashboardHeader workspaceName={workspaceName} />

          <KpiRow />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              <MissedRevenueCard opportunity={opportunity} />

              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Additional Revenue Opportunities
                </p>
                <div className="mt-4">
                  <OpportunitiesGrid opportunities={supportingOpportunities} />
                </div>
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Recommended Campaigns
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-base font-semibold text-gray-900">
                      Drain Cleaning Special
                    </p>
                    <p className="mt-2 text-sm text-gray-600">
                      Capture rising local demand with a quick-response offer.
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-base font-semibold text-gray-900">
                      Water Heater Flush & Save
                    </p>
                    <p className="mt-2 text-sm text-gray-600">
                      Promote a higher-value service to fill open schedule slots.
                    </p>
                  </div>
                </div>
              </section>
            </div>

            <RightRail />
          </div>
        </main>
      </div>
    </div>
  );
}