import { prisma } from "@/lib/prisma";

export async function seedRevenueOpportunity(workspaceId: string) {
  const existing = await prisma.revenueOpportunity.findFirst({
    where: {
      workspaceId,
      isActive: true,
    },
  });

  if (existing) {
    return existing;
  }

  const opportunity = await prisma.revenueOpportunity.create({
    data: {
      workspaceId,
      title: "Drain Cleaning Demand Spike",
      description:
        "Search demand for drain cleaning increased across your service area while competitors are inactive.",
      opportunityType: "LOCAL_SEARCH_SPIKE",
      whyNow: [
        "drain cleaning demand up 18%",
        "competitors inactive",
        "technician capacity available",
      ],
      estimatedRevenueMin: 1900,
      estimatedRevenueMax: 2850,
      estimatedBookedJobsMin: 4,
      estimatedBookedJobsMax: 6,
      confidence: "HIGH",
      capacityFit: "HIGH",
      recommendedCampaignType: "DRAIN_SPECIAL",
      isActive: true,
    },
  });

  return opportunity;
}