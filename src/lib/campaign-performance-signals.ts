import { CampaignStatus, CampaignType } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

export type CampaignPerformanceSignal = {
  campaignType: CampaignType;
  totalCampaigns: number;
  launchedCampaigns: number;
  totalLeads: number;
  bookedJobs: number;
  revenue: number;
  leadToJobRate: number;
  avgRevenuePerCampaign: number;
  avgBookedJobsPerCampaign: number;
  performanceLabel: "Strong" | "Promising" | "New";
  performanceDetail: string;
  scoreBoost: number;
  confidenceBoost: number;
};

export type CampaignPerformanceSignalMap = Partial<
  Record<CampaignType, CampaignPerformanceSignal>
>;

const EXECUTED_STATUSES: CampaignStatus[] = ["LAUNCHED", "COMPLETED"];

function buildSignal(params: {
  campaignType: CampaignType;
  totalCampaigns: number;
  launchedCampaigns: number;
  totalLeads: number;
  bookedJobs: number;
  revenue: number;
}): CampaignPerformanceSignal {
  const {
    campaignType,
    totalCampaigns,
    launchedCampaigns,
    totalLeads,
    bookedJobs,
    revenue,
  } = params;

  const leadToJobRate =
    totalLeads > 0 ? Math.round((bookedJobs / totalLeads) * 100) : 0;

  const avgRevenuePerCampaign =
    totalCampaigns > 0 ? Math.round(revenue / totalCampaigns) : 0;

  const avgBookedJobsPerCampaign =
    totalCampaigns > 0
      ? Number((bookedJobs / totalCampaigns).toFixed(1))
      : 0;

  let performanceLabel: "Strong" | "Promising" | "New" = "New";
  let scoreBoost = 0;
  let confidenceBoost = 0;
  let performanceDetail = "No campaign history yet for this action type.";

  if (launchedCampaigns >= 2 && bookedJobs >= 2 && revenue >= 1500) {
    performanceLabel = "Strong";
    scoreBoost = 8;
    confidenceBoost = 6;
    performanceDetail = `Based on ${launchedCampaigns} past launched campaigns, this action type has already produced ${bookedJobs} booked jobs and $${revenue.toLocaleString()} in revenue.`;
  } else if (launchedCampaigns >= 1 || bookedJobs >= 1 || revenue > 0) {
    performanceLabel = "Promising";
    scoreBoost = 4;
    confidenceBoost = 3;
    performanceDetail = `This action type has early traction from ${launchedCampaigns} launched campaign${launchedCampaigns === 1 ? "" : "s"} and $${revenue.toLocaleString()} in captured revenue.`;
  }

  return {
    campaignType,
    totalCampaigns,
    launchedCampaigns,
    totalLeads,
    bookedJobs,
    revenue,
    leadToJobRate,
    avgRevenuePerCampaign,
    avgBookedJobsPerCampaign,
    performanceLabel,
    performanceDetail,
    scoreBoost,
    confidenceBoost,
  };
}

export async function getCampaignPerformanceSignals(
  workspaceId: string
): Promise<CampaignPerformanceSignalMap> {
  const campaigns = await prisma.campaign.findMany({
    where: { workspaceId },
    include: {
      leads: true,
    },
  });

  const grouped = new Map<
    CampaignType,
    {
      totalCampaigns: number;
      launchedCampaigns: number;
      totalLeads: number;
      bookedJobs: number;
      revenue: number;
    }
  >();

  for (const campaign of campaigns) {
    const current = grouped.get(campaign.campaignType) ?? {
      totalCampaigns: 0,
      launchedCampaigns: 0,
      totalLeads: 0,
      bookedJobs: 0,
      revenue: 0,
    };

    current.totalCampaigns += 1;

    if (EXECUTED_STATUSES.includes(campaign.status)) {
      current.launchedCampaigns += 1;
    }

    current.totalLeads += campaign.leads.length;

    const bookedLeads = campaign.leads.filter((lead) => lead.status === "BOOKED");
    current.bookedJobs += bookedLeads.length;

    current.revenue += bookedLeads.reduce((sum, lead) => {
      return sum + Number(lead.bookedRevenue ?? 0);
    }, 0);

    grouped.set(campaign.campaignType, current);
  }

  const result: CampaignPerformanceSignalMap = {};

  for (const [campaignType, stats] of grouped.entries()) {
    result[campaignType] = buildSignal({
      campaignType,
      ...stats,
    });
  }

  return result;
}