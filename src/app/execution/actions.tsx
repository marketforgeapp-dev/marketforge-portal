"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";

type ExecutionPatch = {
  scheduledLaunchDate?: string | null;
  launchOwner?: string | null;
  launchPlatform?: string | null;
  credentialsReceived?: boolean;
  launchNotes?: string | null;
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
}

export async function queueCampaignWithExecutionDetails(input: {
  campaignId: string;
  scheduledLaunchDate?: string;
  launchOwner?: string;
  launchPlatform?: string;
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

  await prisma.campaign.update({
    where: { id: input.campaignId },
    data: {
      status: "SCHEDULED",
      briefJson: mergeExecutionIntoBriefJson(campaign.briefJson, {
        scheduledLaunchDate: input.scheduledLaunchDate ?? null,
        launchOwner: input.launchOwner ?? null,
        launchPlatform: input.launchPlatform ?? null,
        credentialsReceived: input.credentialsReceived ?? false,
        launchNotes: input.launchNotes ?? null,
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
  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
    },
  });

  revalidateExecution(campaignId);
}