import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { CommandCenterKpis } from "@/components/dashboard/command-center-kpis";
import { TopCommandBand } from "@/components/dashboard/top-command-band";
import { CompetitivePositionCard } from "@/components/dashboard/competitive-position-card";
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

type MetricsData = {
  jobsAvailableLow: number;
  jobsAvailableHigh: number;
  revenueOpportunityLow: number;
  revenueOpportunityHigh: number;
  topActionRevenueLow: number;
  topActionRevenueHigh: number;
  revenueCapturedYtd: number;
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

type CompetitivePositionData = {
  businessRating: number | null;
  businessReviewCount: number | null;
  competitorMedianRating: number | null;
  competitorMedianReviewCount: number | null;
  position: "LEADING" | "COMPETITIVE" | "LAGGING" | "UNKNOWN";
  narrative: string | null;
};

type Props = {
  workspaceName: string;
  workspaceLogoUrl?: string | null;
  workspaceIndustryLabel?: string | null;
  hero: RevenueOpportunityHero;
  heroCampaign: HeroCampaignData;
  metrics: MetricsData;
  revenueCaptured: RevenueCapturedData;
  competitivePosition: CompetitivePositionData;
};

function formatMaybeDate(value?: string | Date) {
  if (!value) return "Recent";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "Recent";
  return date.toLocaleDateString();
}

function formatCurrency(value: number) {
  return `$${value.toLocaleString()}`;
}

function formatStatusLabel(status?: string | null) {
  if (!status) return "Not Generated";

  switch (status) {
    case "DRAFT":
      return "Draft Ready";
    case "APPROVED":
      return "Approved";
    case "SCHEDULED":
      return "Queued";
    case "LAUNCHED":
      return "Launched";
    case "COMPLETED":
      return "Completed";
    default:
      return status;
  }
}

function getActionReadinessSummary(
  heroCampaign: HeroCampaignData,
  revenueCaptured: RevenueCapturedData
) {
  if (revenueCaptured.campaignsLaunched > 0 && revenueCaptured.bookedJobs > 0) {
    return {
      label: "Revenue Generating",
      detail: `${revenueCaptured.bookedJobs} booked jobs have been captured from ${revenueCaptured.campaignsLaunched} launched actions.`,
    };
  }

  if (revenueCaptured.campaignsLaunched > 0) {
    return {
      label: "Actions Live",
      detail: `${revenueCaptured.campaignsLaunched} actions have been launched and are now being tracked.`,
    };
  }

  if (heroCampaign) {
    return {
      label: formatStatusLabel(heroCampaign.status),
      detail:
        heroCampaign.assets.length > 0
          ? "The current top action has launch materials prepared and ready for review."
          : "The current top action exists, but its execution package has not been generated yet.",
    };
  }

  return {
    label: "No Action Generated",
    detail:
      "No execution package exists yet. Generate and approve an action to move work into launch.",
  };
}

export function DashboardShell({
  workspaceName,
  workspaceLogoUrl,
  hero,
  heroCampaign,
  metrics,
  revenueCaptured,
  competitivePosition,
}: Props) {
  const recentEntries = revenueCaptured.entries.slice(0, 2);
  const actionReadiness = getActionReadinessSummary(
    heroCampaign,
    revenueCaptured
  );

  return (
    <div className="mf-page-shell min-h-screen px-4 py-5 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5 lg:flex-row">
        <DashboardSidebar />

        <main className="min-w-0 flex-1 space-y-5">
          <DashboardHeader
            workspaceName={workspaceName}
            logoUrl={workspaceLogoUrl}
          />

          <CommandCenterKpis
            jobsLow={metrics.jobsAvailableLow}
            jobsHigh={metrics.jobsAvailableHigh}
            revenueOpportunityLow={metrics.revenueOpportunityLow}
            revenueOpportunityHigh={metrics.revenueOpportunityHigh}
            topActionRevenueLow={metrics.topActionRevenueLow}
            topActionRevenueHigh={metrics.topActionRevenueHigh}
            revenueCapturedYtd={metrics.revenueCapturedYtd}
            attributedJobs={metrics.attributedJobs}
            leadToJobRate={metrics.leadToJobRate}
          />

          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0">
              <TopCommandBand
                hero={hero}
                heroCampaign={heroCampaign}
                logoUrl={workspaceLogoUrl}
              />
            </div>

            <aside className="space-y-4">
              <CompetitivePositionCard
                businessRating={competitivePosition.businessRating}
                businessReviewCount={competitivePosition.businessReviewCount}
                competitorMedianRating={competitivePosition.competitorMedianRating}
                competitorMedianReviewCount={competitivePosition.competitorMedianReviewCount}
                position={competitivePosition.position}
                narrative={competitivePosition.narrative}
              />

              <section className="mf-card rounded-3xl p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                  Action Readiness
                </p>

                <div className="mt-3 space-y-2.5">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      Status
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {actionReadiness.label}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      Package
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {heroCampaign?.assets.length ?? 0} assets for current top action
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      Summary
                    </p>
                    <p className="mt-1 text-sm leading-5 text-gray-700">
                      {actionReadiness.detail}
                    </p>
                  </div>
                </div>
              </section>

              <section className="mf-card rounded-3xl p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                  Recent Revenue Proof
                </p>

                {recentEntries.length === 0 ? (
                  <p className="mt-3 text-sm leading-5 text-gray-600">
                    Revenue proof will appear once launched actions produce booked jobs and attributed revenue.
                  </p>
                ) : (
                  <div className="mt-3 space-y-2.5">
                    {recentEntries.map((entry, index) => (
                      <div
                        key={entry.id ?? `${entry.campaignName ?? "entry"}-${index}`}
                        className="rounded-2xl border border-gray-200 bg-gray-50 p-3"
                      >
                        <p className="text-sm font-semibold text-gray-900">
                          {entry.campaignName ?? "Revenue Entry"}
                        </p>

                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                          <span>
                            {formatCurrency(Number(entry.revenue ?? 0))} revenue
                          </span>
                          <span>•</span>
                          <span>{entry.bookedJobs ?? 0} booked jobs</span>
                        </div>

                        <p className="mt-1.5 text-xs text-gray-500">
                          {formatMaybeDate(entry.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}