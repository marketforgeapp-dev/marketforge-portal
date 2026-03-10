import { DashboardHeader } from "./dashboard-header";
import { DashboardSidebar } from "./dashboard-sidebar";
import { RightRail } from "./right-rail";
import {
  OpportunitiesGrid,
  type OpportunityCardData,
} from "@/components/opportunities/opportunities-grid";
import { RevenueOpportunityHero } from "@/lib/revenue-opportunity-engine";
import { DashboardRecommendationCard } from "./recommended-campaigns-panel";
import { TopCommandBand } from "./top-command-band";
import { CommandCenterKpis } from "./command-center-kpis";

type DashboardMetrics = {
  revenueCapturedYtd: number;
  roi: number;
  activeOpportunities: number;
  queuedForLaunch: number;
  attributedJobs: number;
  leadToJobRate: number;
};

type DashboardShellProps = {
  workspaceName: string;
  hero: RevenueOpportunityHero;
  opportunities: OpportunityCardData[];
  recommendations: DashboardRecommendationCard[];
  metrics: DashboardMetrics;
};

export function DashboardShell({
  workspaceName,
  hero,
  opportunities,
  recommendations,
  metrics,
}: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row">
        <DashboardSidebar />

        <main className="flex-1 space-y-6">
          <DashboardHeader workspaceName={workspaceName} />

          <CommandCenterKpis
            jobsLow={hero.jobsLow}
            jobsHigh={hero.jobsHigh}
            revenueOpportunityLow={hero.revenueLow}
            revenueOpportunityHigh={hero.revenueHigh}
            revenueCapturedYtd={metrics.revenueCapturedYtd}
            roi={metrics.roi}
            activeOpportunities={metrics.activeOpportunities}
            queuedForLaunch={metrics.queuedForLaunch}
            attributedJobs={metrics.attributedJobs}
            leadToJobRate={metrics.leadToJobRate}
          />

          <TopCommandBand hero={hero} recommendations={recommendations} />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Additional Revenue Opportunities
              </p>
              <div className="mt-4">
                <OpportunitiesGrid opportunities={opportunities} />
              </div>
            </section>

            <RightRail />
          </div>
        </main>
      </div>
    </div>
  );
}