import { prisma } from "@/lib/prisma";

export async function getRevenueCapturedSummary(workspaceId: string) {
  const leads = await prisma.lead.findMany({
    where: { workspaceId },
    include: { campaign: true },
  });

  const bookedLeads = leads.filter((lead) => lead.status === "BOOKED");

  const revenueByCampaign: Record<
    string,
    { campaignName: string; jobs: number; revenue: number }
  > = {};

  for (const lead of bookedLeads) {
    if (!lead.campaignId || !lead.campaign) continue;

    const campaignName = lead.campaign.name;

    let revenueForLead = 0;

    if (lead.bookedRevenue) {
      revenueForLead = Number(lead.bookedRevenue);
    } else {
      const estimatedRevenue = Number(lead.campaign.estimatedRevenue ?? 0);
      const estimatedBookedJobs = lead.campaign.estimatedBookedJobs ?? 0;

      if (estimatedRevenue > 0 && estimatedBookedJobs > 0) {
        revenueForLead = Math.round(
          estimatedRevenue / Math.max(estimatedBookedJobs, 1)
        );
      } else {
        revenueForLead = 450;
      }
    }

    if (!revenueByCampaign[lead.campaignId]) {
      revenueByCampaign[lead.campaignId] = {
        campaignName,
        jobs: 0,
        revenue: 0,
      };
    }

    revenueByCampaign[lead.campaignId].jobs += 1;
    revenueByCampaign[lead.campaignId].revenue += revenueForLead;
  }

  const entries = Object.values(revenueByCampaign)
    .map((campaign) => ({
      campaignName: campaign.campaignName,
      jobsGenerated: campaign.jobs,
      revenue: campaign.revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const totalRevenue = entries.reduce((sum, entry) => sum + entry.revenue, 0);
  const bookedJobs = bookedLeads.length;
  const campaignsLaunched = entries.length;
  const winRate =
    leads.length > 0 ? Math.round((bookedJobs / leads.length) * 100) : 0;

  return {
    totalRevenue,
    bookedJobs,
    campaignsLaunched,
    winRate,
    entries,
  };
}