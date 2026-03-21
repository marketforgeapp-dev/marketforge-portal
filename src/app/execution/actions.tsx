"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { ensureCampaignBaselineSnapshot } from "@/lib/campaign-baseline";

type ExecutionPatch = {
  scheduledLaunchDate?: string | null;
  launchOwner?: string | null;
  credentialsReceived?: boolean;
  launchNotes?: string | null;
  approvedAssetTypes?: string[];
};

function mergeExecutionIntoBriefJson(
  briefJson: Prisma.JsonValue | null,
  patch: ExecutionPatch
): Prisma.InputJsonValue {
  const base =
    briefJson && typeof briefJson === "object" && !Array.isArray(briefJson)
      ? (briefJson as Record<string, unknown>)
      : {};

  const existingExecution =
    base.execution &&
    typeof base.execution === "object" &&
    !Array.isArray(base.execution)
      ? (base.execution as Record<string, unknown>)
      : {};

  return {
    ...base,
    execution: {
      ...existingExecution,
      ...patch,
    },
  };
}

function revalidateExecution(campaignId: string) {
  revalidatePath("/execution");
  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/dashboard");
  revalidatePath("/reports");
}

export async function queueCampaignWithExecutionDetails(input: {
  campaignId: string;
  scheduledLaunchDate?: string;
  launchOwner?: string;
  credentialsReceived?: boolean;
  launchNotes?: string;
}) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: input.campaignId },
    select: {
      id: true,
      briefJson: true,
    },
  });

  if (!campaign) return;

  await ensureCampaignBaselineSnapshot(input.campaignId);

  const approvedAssets = await prisma.campaignAsset.findMany({
  where: {
    campaignId: input.campaignId,
    isApproved: true,
  },
});

  await prisma.campaign.update({
    where: { id: input.campaignId },
    data: {
      status: "SCHEDULED",
      briefJson: mergeExecutionIntoBriefJson(campaign.briefJson, {
        scheduledLaunchDate: input.scheduledLaunchDate ?? null,
        launchOwner: input.launchOwner ?? null,
        credentialsReceived: input.credentialsReceived ?? false,
        launchNotes: input.launchNotes ?? null,
        approvedAssetTypes: approvedAssets.map((a) => a.assetType),
      }),
    },
  });

  revalidateExecution(input.campaignId);
}

export async function markCampaignLaunched(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      briefJson: true,
    },
  });

  if (!campaign) return;

  await ensureCampaignBaselineSnapshot(campaignId);

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: "LAUNCHED",
      launchedAt: new Date(),
      briefJson: mergeExecutionIntoBriefJson(campaign.briefJson, {
        launchNotes: "Campaign marked as launched by MarketForge.",
      }),
    },
  });

  revalidateExecution(campaignId);
}

export async function markCampaignCompleted(campaignId: string) {
  await ensureCampaignBaselineSnapshot(campaignId);

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
    },
  });

  revalidateExecution(campaignId);
}