import { notFound, redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma";
import { getCurrentWorkspace } from "@/lib/get-current-workspace";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { CampaignDetailHeader } from "@/components/campaigns/campaign-detail-header";
import { CampaignBriefPanel } from "@/components/campaigns/campaign-brief-panel";
import { CampaignAssetsReview } from "@/components/campaigns/campaign-assets-review";
import { CampaignStatusActions } from "@/components/campaigns/campaign-status-actions";
import { prisma } from "@/lib/prisma";

type CampaignBriefData = {
  userPrompt?: string;
  parsedIntent?: {
    serviceCategory?: string;
    intent?: string;
    urgency?: string;
    timeframe?: string;
    promotionType?: string;
  };
  opportunityCheck?: {
    matchedOpportunityTitle?: string | null;
    matchedRecommendationTitle?: string | null;
    confidenceScore?: number;
    sourceTags?: string[];
    whyNowBullets?: string[];
    whyThisMatters?: string;
    rationale?: string;
  };
  campaignDraft?: {
    description?: string;
    offer?: string;
    audience?: string;
    cta?: string;
  };
  creativeGuidance?: {
    recommendedImage?: string;
    avoidImagery?: string;
  };
};

type Props = {
  params: Promise<{
    campaignId: string;
  }>;
};

function toCampaignBriefData(
  value: Prisma.JsonValue | null
): CampaignBriefData | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as CampaignBriefData;
}

export default async function CampaignDetailPage({ params }: Props) {
  const workspace = await getCurrentWorkspace();

  if (!workspace || !workspace.onboardingCompletedAt) {
    redirect("/onboarding");
  }

  const { campaignId } = await params;

  const campaign = await prisma.campaign.findFirst({
    where: {
      id: campaignId,
      workspaceId: workspace.id,
    },
    include: {
      assets: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!campaign) {
    notFound();
  }

  const briefData = toCampaignBriefData(campaign.briefJson);

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row">
        <DashboardSidebar />

        <main className="flex-1 space-y-6">
          <CampaignDetailHeader campaign={campaign} />
          <CampaignStatusActions campaignId={campaign.id} status={campaign.status}/>
          <CampaignBriefPanel briefJson={briefData} />
          <CampaignAssetsReview assets={campaign.assets} />
        </main>
      </div>
    </div>
  );
}