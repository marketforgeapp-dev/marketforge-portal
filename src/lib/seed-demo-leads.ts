import { prisma } from "@/lib/prisma";

export async function seedDemoLeads(workspaceId: string) {
  const existing = await prisma.lead.findMany({
    where: { workspaceId },
    take: 1,
  });

  if (existing.length > 0) {
    return;
  }

  const campaigns = await prisma.campaign.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
  });

  const opportunities = await prisma.revenueOpportunity.findMany({
    where: { workspaceId, isActive: true },
    orderBy: { createdAt: "asc" },
  });

  const drainCampaign =
    campaigns.find((c) => c.name.includes("Drain")) ?? campaigns[0] ?? null;

  const waterHeaterCampaign =
    campaigns.find((c) => c.name.includes("Water Heater")) ?? campaigns[1] ?? null;

  const drainOpportunity =
    opportunities.find((o) => o.title.includes("Drain")) ?? opportunities[0] ?? null;

  const waterHeaterOpportunity =
    opportunities.find((o) => o.title.includes("Water Heater")) ?? opportunities[1] ?? null;

  await prisma.lead.createMany({
    data: [
      {
        workspaceId,
        campaignId: drainCampaign?.id ?? null,
        revenueOpportunityId: drainOpportunity?.id ?? null,
        leadName: "Sarah Mitchell",
        phone: "(770) 555-0182",
        email: "sarah.mitchell@example.com",
        source: "Drain Cleaning Special",
        notes: "Reported recurring kitchen sink backup. Requested callback this afternoon.",
        status: "NEW",
      },
      {
        workspaceId,
        campaignId: drainCampaign?.id ?? null,
        revenueOpportunityId: drainOpportunity?.id ?? null,
        leadName: "Jason Turner",
        phone: "(678) 555-0114",
        email: "jason.turner@example.com",
        source: "Drain Cleaning Special",
        notes: "Slow shower drain and possible main line issue.",
        status: "CONTACTED",
      },
      {
        workspaceId,
        campaignId: waterHeaterCampaign?.id ?? null,
        revenueOpportunityId: waterHeaterOpportunity?.id ?? null,
        leadName: "Rebecca Hayes",
        phone: "(404) 555-0198",
        email: "rebecca.hayes@example.com",
        source: "Water Heater Upgrade Push",
        notes: "Old unit leaking slightly. Estimate visit set for Wednesday morning.",
        status: "ESTIMATE_SCHEDULED",
      },
      {
        workspaceId,
        campaignId: waterHeaterCampaign?.id ?? null,
        revenueOpportunityId: waterHeaterOpportunity?.id ?? null,
        leadName: "Mark Ellison",
        phone: "(770) 555-0167",
        email: "mark.ellison@example.com",
        source: "Water Heater Upgrade Push",
        notes: "Booked full replacement after estimate approval.",
        status: "BOOKED",
      },
      {
        workspaceId,
        campaignId: drainCampaign?.id ?? null,
        revenueOpportunityId: drainOpportunity?.id ?? null,
        leadName: "Lauren Bishop",
        phone: "(678) 555-0133",
        email: "lauren.bishop@example.com",
        source: "Drain Cleaning Special",
        notes: "Chose to postpone work until later in the month.",
        status: "LOST",
      },
    ],
  });
}