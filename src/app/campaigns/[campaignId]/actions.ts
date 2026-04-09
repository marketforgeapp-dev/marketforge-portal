"use server";

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CampaignStatus } from "@/generated/prisma";
import { invalidateWorkspaceOpportunitySnapshot } from "@/lib/opportunity-snapshot";
import { sendCampaignApprovalNotification } from "@/lib/email/send-campaign-approval-notification";

function revalidateCampaignViews(campaignId: string) {
  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/campaigns");
  revalidatePath("/dashboard");
  revalidatePath("/execution");
  revalidatePath("/reports");
}

async function notifyCampaignApproved(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      name: true,
      targetService: true,
      workspaceId: true,
    },
  });

  if (!campaign) {
    return;
  }

  const profile = await prisma.businessProfile.findUnique({
    where: { workspaceId: campaign.workspaceId },
    select: {
      businessName: true,
    },
  });

  try {
    await sendCampaignApprovalNotification({
      businessName: profile?.businessName ?? "MarketForge Customer",
      campaignName: campaign.name,
      targetService: campaign.targetService ?? null,
    });
  } catch (error) {
    console.error("[campaign-approval-email] failed", {
      campaignId,
      error,
    });
  }
}

export async function approveCampaign(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { workspaceId: true },
  });

  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: "APPROVED",
    },
  });

  await notifyCampaignApproved(campaignId);

  await invalidateWorkspaceOpportunitySnapshot(campaign.workspaceId);

  revalidateCampaignViews(campaignId);
}

export async function queueCampaignForLaunch(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { workspaceId: true },
  });

  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: "SCHEDULED",
    },
  });

  await invalidateWorkspaceOpportunitySnapshot(campaign.workspaceId);

  revalidateCampaignViews(campaignId);
}

export async function saveCampaignBriefEdits(input: {
  campaignId: string;
  name: string;
  targetService: string;
  offer: string;
  audience: string;
  description: string;
  cta: string;
  recommendedImage: string;
  avoidImagery: string;
}) {
  const existing = await prisma.campaign.findUnique({
    where: { id: input.campaignId },
    select: {
      briefJson: true,
    },
  });

  if (!existing) {
    throw new Error("Campaign not found.");
  }

  const currentBrief =
    existing.briefJson && typeof existing.briefJson === "object" && !Array.isArray(existing.briefJson)
      ? (existing.briefJson as Record<string, unknown>)
      : {};

  const currentCampaignDraft =
    currentBrief.campaignDraft &&
    typeof currentBrief.campaignDraft === "object" &&
    !Array.isArray(currentBrief.campaignDraft)
      ? (currentBrief.campaignDraft as Record<string, unknown>)
      : {};

    const currentActionSpec =
    currentBrief.actionSpec &&
    typeof currentBrief.actionSpec === "object" &&
    !Array.isArray(currentBrief.actionSpec)
      ? (currentBrief.actionSpec as Record<string, unknown>)
      : {};

  const currentCreativeGuidance =
    currentBrief.creativeGuidance &&
    typeof currentBrief.creativeGuidance === "object" &&
    !Array.isArray(currentBrief.creativeGuidance)
      ? (currentBrief.creativeGuidance as Record<string, unknown>)
      : {};

  await prisma.campaign.update({
    where: { id: input.campaignId },
    data: {
      name: input.name,
      targetService: input.targetService || null,
      offer: input.offer || null,
      audience: input.audience || null,
      briefJson: {
        ...currentBrief,
                campaignDraft: {
          ...currentCampaignDraft,
          description: input.description,
          offer: input.offer,
          audience: input.audience,
          cta: input.cta,
        },
        actionSpec: {
          ...currentActionSpec,
          actionName: input.name,
          targetService: input.targetService,
          targetAudience: input.audience,
          offerLabel: input.offer || null,
          cta: input.cta,
          coreMessageAngle: input.description,
        },
        creativeGuidance: {
          ...currentCreativeGuidance,
          recommendedImage: input.recommendedImage,
          avoidImagery: input.avoidImagery,
        },
        lastEditedAt: new Date().toISOString(),
      },
      qualityReviewStatus: "PENDING",
    },
  });

  revalidateCampaignViews(input.campaignId);
}

export async function saveCampaignAssetEdit(input: {
  campaignId: string;
  assetId: string;
  title: string;
  content: string;
}) {
  await prisma.campaignAsset.update({
    where: { id: input.assetId },
    data: {
      title: input.title || null,
      content: input.content,
      isApproved: false,
    },
  });

  await prisma.campaign.update({
    where: { id: input.campaignId },
    data: {
      qualityReviewStatus: "PENDING",
    },
  });

  revalidateCampaignViews(input.campaignId);
}

export async function resetCampaignToReview(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      status: true,
      workspaceId: true,
    },
  });

  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  const reviewableStatuses: CampaignStatus[] = ["READY", "APPROVED", "SCHEDULED"];

  if (!reviewableStatuses.includes(campaign.status)) {
    return;
  }

    await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: "READY",
      qualityReviewStatus: "PENDING",
    },
  });

  await invalidateWorkspaceOpportunitySnapshot(campaign.workspaceId);

  revalidateCampaignViews(campaignId);
}