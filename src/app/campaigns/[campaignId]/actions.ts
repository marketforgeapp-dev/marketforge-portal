"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function approveCampaign(campaignId: string) {
  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: "APPROVED",
      qualityReviewStatus: "APPROVED",
    },
  });

  await prisma.campaignAsset.updateMany({
    where: { campaignId },
    data: {
      isApproved: true,
      approvedAt: new Date(),
    },
  });

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/campaigns");
}

export async function queueCampaignForLaunch(campaignId: string) {
  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: "SCHEDULED",
    },
  });

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/campaigns");
}