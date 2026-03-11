import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CampaignDetailHeader } from "@/components/campaigns/campaign-detail-header";
import { CampaignStatusActions } from "@/components/campaigns/campaign-status-actions";
import { CampaignBriefPanel } from "@/components/campaigns/campaign-brief-panel";
import { CampaignAssetsReview } from "@/components/campaigns/campaign-assets-review";

type Props = {
  params: Promise<{
    campaignId: string;
  }>;
};

function calculateEstimatedFallbackRevenue(params: {
  bookedJobs: number;
  estimatedBookedJobs: number | null;
  estimatedRevenue: unknown;
}) {
  const { bookedJobs, estimatedBookedJobs, estimatedRevenue } = params;

  const totalEstimatedRevenue = Number(estimatedRevenue ?? 0);
  const estimatedJobs = estimatedBookedJobs ?? 0;

  if (bookedJobs <= 0) return 0;
  if (totalEstimatedRevenue <= 0 || estimatedJobs <= 0) return 0;

  const perJobRevenue = totalEstimatedRevenue / Math.max(estimatedJobs, 1);
  return Math.round(bookedJobs * perJobRevenue);
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

  const totalLeads = campaign.leads.length;
  const bookedLeads = campaign.leads.filter((lead) => lead.status === "BOOKED");
  const bookedJobs = bookedLeads.length;

  const actualLeadRevenue = bookedLeads.reduce((sum, lead) => {
    return sum + Number(lead.bookedRevenue ?? 0);
  }, 0);

  const attributedRevenue = campaign.attributions.reduce((sum, entry) => {
    return sum + Number(entry.revenue ?? 0);
  }, 0);

  const estimatedFallbackRevenue = calculateEstimatedFallbackRevenue({
    bookedJobs,
    estimatedBookedJobs: campaign.estimatedBookedJobs,
    estimatedRevenue: campaign.estimatedRevenue,
  });

  const revenueSoFar =
    actualLeadRevenue > 0
      ? actualLeadRevenue
      : attributedRevenue > 0
        ? attributedRevenue
        : estimatedFallbackRevenue;

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <CampaignDetailHeader
          campaign={{
            id: campaign.id,
            name: campaign.name,
            status: campaign.status,
            estimatedLeads: campaign.estimatedLeads,
            estimatedBookedJobs: campaign.estimatedBookedJobs,
            estimatedRevenue: Number(campaign.estimatedRevenue ?? 0),
            targetService: campaign.targetService,
            recommendationTitle: campaign.recommendation?.title ?? null,
            opportunityTitle: campaign.revenueOpportunity?.title ?? null,
            opportunityType: campaign.revenueOpportunity?.opportunityType ?? null,
          }}
          results={{
            totalLeads,
            bookedJobs,
            revenueSoFar,
          }}
        />

        <CampaignStatusActions
          campaignId={campaign.id}
          status={campaign.status}
        />

        <CampaignBriefPanel
          campaignId={campaign.id}
          status={campaign.status}
          campaignName={campaign.name}
          targetService={campaign.targetService}
          offer={campaign.offer}
          audience={campaign.audience}
          briefJson={campaign.briefJson}
        />

        <CampaignAssetsReview
          campaignId={campaign.id}
          status={campaign.status}
          assets={campaign.assets}
        />
      </div>
    </div>
  );
}