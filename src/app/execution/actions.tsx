"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { ensureCampaignBaselineSnapshot } from "@/lib/campaign-baseline";
import { sendCampaignStageNotification } from "@/lib/email/send-campaign-stage-notification";

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

function extractExecutionMeta(briefJson: Prisma.JsonValue | null) {
  if (!briefJson || typeof briefJson !== "object" || Array.isArray(briefJson)) {
    return null;
  }

  const base = briefJson as Record<string, unknown>;
  const execution = base.execution;

  if (!execution || typeof execution !== "object" || Array.isArray(execution)) {
    return null;
  }

  return execution as {
    scheduledLaunchDate?: string | null;
    launchOwner?: string | null;
  };
}

async function getCampaignNotificationContext(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      name: true,
      targetService: true,
      workspaceId: true,
      briefJson: true,
    },
  });

  if (!campaign) {
    return null;
  }

  const profile = await prisma.businessProfile.findUnique({
    where: { workspaceId: campaign.workspaceId },
    select: {
      id: true,
      businessName: true,
    },
  });

  const user = profile
    ? await prisma.user.findUnique({
        where: { id: profile.id },
        select: {
          email: true,
        },
      })
    : null;

  const executionMeta = extractExecutionMeta(campaign.briefJson);

  return {
    campaign,
    profile,
    businessEmail: user?.email ?? null,
    executionMeta,
  };
}

async function notifyCampaignStage(
  campaignId: string,
  stage: "SCHEDULED" | "LAUNCHED" | "COMPLETED"
) {
  const context = await getCampaignNotificationContext(campaignId);

  if (!context) {
    return;
  }

  try {
    await sendCampaignStageNotification({
      stage,
      businessName: context.profile?.businessName ?? "MarketForge Customer",
      businessEmail: context.businessEmail ?? null,
      campaignName: context.campaign.name,
      targetService: context.campaign.targetService ?? null,
      launchOwner: context.executionMeta?.launchOwner ?? null,
      scheduledLaunchDate: context.executionMeta?.scheduledLaunchDate ?? null,
    });
  } catch (error) {
    console.error("[campaign-stage-email] failed", {
      campaignId,
      stage,
      error,
    });
  }
}

function revalidateExecution(campaignId: string) {
  revalidatePath("/execution");
  revalidatePath(`/execution/${campaignId}`);
  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/dashboard");
  revalidatePath("/reports");

  revalidatePath("/admin");
  revalidatePath("/admin/launch-queue");
  revalidatePath("/portal/admin");
  revalidatePath("/portal/admin/launch-queue");
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

  await notifyCampaignStage(input.campaignId, "SCHEDULED");
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

  await notifyCampaignStage(campaignId, "LAUNCHED");
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

  await notifyCampaignStage(campaignId, "COMPLETED");
  revalidateExecution(campaignId);
}