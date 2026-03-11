import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { CommandCenterKpis } from "@/components/dashboard/command-center-kpis";
import { TopCommandBand } from "@/components/dashboard/top-command-band";
import { RevenueOpportunityHero } from "@/lib/revenue-opportunity-engine";

type HeroCampaignData = {
  id: string;
  name: string;
  status: string;
  targetService: string | null;
  offer: string | null;
  audience: string | null;
  briefJson: unknown;
  assets: {
    id: string;
    assetType: string;
    title: string | null;
    content: string;
  }[];
} | null;

type RecommendationCardData = {
  id: string;
  title: string;
  description: string | null;
  score: number;
  estimatedRevenueMin: number;
  estimatedRevenueMax: number;
  estimatedBookedJobsMin: number | null;
  estimatedBookedJobsMax: number | null;
  linkedCampaignId: string | null;
};

type MetricsData = {
  jobsAvailableLow: number;
  jobsAvailableHigh: number;
  revenueOpportunityLow: number;
  revenueOpportunityHigh: number;
  revenueCapturedYtd: number;
  roi: number;
  activeOpportunities: number;
  queuedForLaunch: number;
  attributedJobs: number;
  leadToJobRate: number;
};

type RevenueCapturedEntry = {
  id?: string;
  campaignName?: string | null;
  revenue?: number;
  bookedJobs?: number;
  createdAt?: string | Date;
};

type RevenueCapturedData = {
  totalRevenue: number;
  bookedJobs: number;
  campaignsLaunched: number;
  winRate: number;
  entries: RevenueCapturedEntry[];
};

type Props = {
  workspaceName: string;
  workspaceLogoUrl?: string | null;
  hero: RevenueOpportunityHero;
  heroCampaign: HeroCampaignData;
  recommendations: RecommendationCardData[];
  metrics: MetricsData;
  revenueCaptured: RevenueCapturedData;
};

function formatMaybeDate(value?: string | Date) {
  if (!value) return "Recent";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "Recent";
  return date.toLocaleDateString();
}

export function DashboardShell({
  workspaceName,
  workspaceLogoUrl,
  hero,
  heroCampaign,
  recommendations,
  metrics,
  revenueCaptured,
}: Props) {
  const recentEntries = revenueCaptured.entries.slice(0, 3);

  return (
    <div className="mf-page-shell min-h-screen px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6 lg:flex-row">
        <DashboardSidebar />

        <main className="min-w-0 flex-1 space-y-6">
          <DashboardHeader
            workspaceName={workspaceName}
            logoUrl={workspaceLogoUrl}
          />

          <CommandCenterKpis
            jobsLow={metrics.jobsAvailableLow}
            jobsHigh={metrics.jobsAvailableHigh}
            revenueOpportunityLow={metrics.revenueOpportunityLow}
            revenueOpportunityHigh={metrics.revenueOpportunityHigh}
            revenueCapturedYtd={metrics.revenueCapturedYtd}
            roi={metrics.roi}
            activeOpportunities={metrics.activeOpportunities}
            queuedForLaunch={metrics.queuedForLaunch}
            attributedJobs={metrics.attributedJobs}
            leadToJobRate={metrics.leadToJobRate}
          />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0">
              <TopCommandBand
                hero={hero}
                heroCampaign={heroCampaign}
                recommendations={recommendations}
              />
            </div>

            <aside className="space-y-6">
              <section className="mf-card mf-card-success rounded-3xl p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Revenue Captured by MarketForge
                </p>

                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-3xl font-bold tracking-tight text-gray-900">
                      ${revenueCaptured.totalRevenue.toLocaleString()}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      Captured revenue tied to launched campaigns
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-gray-50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                        Jobs Booked
                      </p>
                      <p className="mt-1 text-lg font-semibold text-gray-900">
                        {revenueCaptured.bookedJobs}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-gray-50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                        Win Rate
                      </p>
                      <p className="mt-1 text-lg font-semibold text-gray-900">
                        {revenueCaptured.winRate}%
                      </p>
                    </div>

                    <div className="rounded-2xl bg-gray-50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                        Campaigns Launched
                      </p>
                      <p className="mt-1 text-lg font-semibold text-gray-900">
                        {revenueCaptured.campaignsLaunched}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-gray-50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                        Active Opportunities
                      </p>
                      <p className="mt-1 text-lg font-semibold text-gray-900">
                        {metrics.activeOpportunities}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="mf-card rounded-3xl p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Recent Revenue Proof
                </p>

                {recentEntries.length === 0 ? (
                  <p className="mt-4 text-sm leading-6 text-gray-600">
                    Revenue proof will appear here as campaigns generate booked
                    jobs and attributed revenue.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {recentEntries.map((entry, index) => (
                      <div
                        key={entry.id ?? `${entry.campaignName ?? "entry"}-${index}`}
                        className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                      >
                        <p className="text-sm font-semibold text-gray-900">
                          {entry.campaignName ?? "Campaign Revenue Entry"}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                          <span>
                            ${Number(entry.revenue ?? 0).toLocaleString()} revenue
                          </span>
                          <span>•</span>
                          <span>{entry.bookedJobs ?? 0} booked jobs</span>
                        </div>

                        <p className="mt-2 text-xs text-gray-500">
                          {formatMaybeDate(entry.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="mf-card rounded-3xl p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Operator View
                </p>

                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      Best Move
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {hero.bestMove}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      Capacity Fit
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {hero.capacityFit}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      Source Signals
                    </p>
                    <p className="mt-1 text-sm text-gray-700">
                      {hero.sourceTags.join(" • ")}
                    </p>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}