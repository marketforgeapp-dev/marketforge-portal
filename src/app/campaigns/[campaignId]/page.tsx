import { notFound } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { prisma } from "@/lib/prisma";
import { CampaignStatusActions } from "@/components/campaigns/campaign-status-actions";
import { CampaignBriefPanel } from "@/components/campaigns/campaign-brief-panel";
import { CampaignAssetsReview } from "@/components/campaigns/campaign-assets-review";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { getRecommendedActionBudget } from "@/lib/budget-allocation-recommendations";

type Props = {
  params: Promise<{
    campaignId: string;
  }>;
};

type BudgetBriefShape = {
  estimatedRange?: {
    revenueLow?: number;
    revenueHigh?: number;
  };
  nextBestAction?: {
    actionType?: string;
  };
};

function parseBudgetBrief(value: unknown): BudgetBriefShape | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as BudgetBriefShape;
}

export default async function CampaignDetailPage({ params }: Props) {
  const { campaignId } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      recommendation: true,
      revenueOpportunity: true,
      assets: {
        orderBy: { createdAt: "asc" },
      },
      leads: {
        orderBy: { createdAt: "desc" },
      },
      attributions: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!campaign) {
    notFound();
  }

  const profile = await prisma.businessProfile.findUnique({
    where: { workspaceId: campaign.workspaceId },
    select: {
      logoUrl: true,
      businessName: true,
      website: true,
      industryLabel: true,
    },
  });

  const brief = parseBudgetBrief(campaign.briefJson);

  const actionBudget = getRecommendedActionBudget({
    revenueLow: brief?.estimatedRange?.revenueLow,
    revenueHigh:
      brief?.estimatedRange?.revenueHigh ??
      Number(campaign.estimatedRevenue ?? 0),
    actionFraming: brief?.nextBestAction?.actionType,
  });

  return (
    <div className="mf-page-shell min-h-screen px-4 py-5 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5 lg:flex-row">
        <DashboardSidebar />

        <main className="min-w-0 flex-1 space-y-5">
          <DashboardHeader
            workspaceName={profile?.businessName ?? "MarketForge Workspace"}
            logoUrl={profile?.logoUrl ?? null}
          />

          <section className="mf-dark-panel mf-grid-glow rounded-3xl px-5 py-5 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#F5B942]">
              Action Approval
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white md:text-3xl">
              Review and approve this action
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">
              Check what will go live, approve the action when it looks right,
              and keep execution moving forward with confidence.
            </p>
          </section>

          <CampaignStatusActions
            campaignId={campaign.id}
            status={campaign.status}
            campaignName={campaign.name}
            estimatedBookedJobs={campaign.estimatedBookedJobs}
            estimatedRevenue={Number(campaign.estimatedRevenue ?? 0)}
            actionBudget={actionBudget}
            briefJson={campaign.briefJson}
          />

          <CampaignAssetsReview
            campaignId={campaign.id}
            status={campaign.status}
            assets={campaign.assets}
            logoUrl={profile?.logoUrl ?? null}
            businessName={profile?.businessName ?? null}
            websiteUrl={profile?.website ?? null}
            industryLabel={profile?.industryLabel ?? null}
          />

          <CampaignBriefPanel
            campaignId={campaign.id}
            status={campaign.status}
            campaignName={campaign.name}
            targetService={campaign.targetService}
            offer={campaign.offer}
            audience={campaign.audience}
            briefJson={campaign.briefJson}
            logoUrl={profile?.logoUrl ?? null}
            industryLabel={profile?.industryLabel ?? null}
          />
        </main>
      </div>
    </div>
  );
}