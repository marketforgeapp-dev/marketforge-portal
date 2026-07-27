"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  CampaignStatus,
  Prisma,
} from "@/generated/prisma";
import {
  invalidateWorkspaceOpportunitySnapshot,
  refreshWorkspaceOpportunitySnapshotFromDecisionCache,
} from "@/lib/opportunity-snapshot";
import { sendCampaignApprovalNotification } from "@/lib/email/send-campaign-approval-notification";
import {
  evaluateCommercialApprovalReadiness,
  type CommercialApprovalBlocker,
} from "@/lib/nlp/commercial/approval-readiness";
import {
  applyPersistedCommercialReusableInputs,
  type CommercialReusableInputs,
  type CommercialVendorReadiness,
} from "@/lib/nlp/commercial/persisted-owner-inputs";

type CampaignBriefMarketShape = {
  market?: string;
};

function isCommercialCampaignBrief(
  value: unknown
) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  return (
    (value as CampaignBriefMarketShape)
      .market === "COMMERCIAL"
  );
}

export type ApproveCampaignResult =
  | {
      success: true;
    }
  | {
      success: false;
      blocked: true;
      title: string;
      message: string;
      blockers: CommercialApprovalBlocker[];
    };

export type SaveCommercialReusableInputsResult =
  | {
      success: true;
      updatedAssetCount: number;
      remainingReusableInputCount: number;
    }
  | {
      success: false;
      error: string;
    };

function revalidateCampaignViews(campaignId: string) {
  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/campaigns");
  revalidatePath("/dashboard");
  revalidatePath("/opportunities");
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

export async function approveCampaign(
  campaignId: string
): Promise<ApproveCampaignResult> {
  const campaign =
    await prisma.campaign.findUnique({
      where: {
        id: campaignId,
      },

      select: {
        workspaceId: true,
        briefJson: true,

        assets: {
          select: {
            id: true,
            title: true,
            content: true,
            isApproved: true,
            metadataJson: true,
          },
        },
      },
    });

    if (!campaign) {
    throw new Error(
      "Campaign not found."
    );
  }

  const isCommercial =
    isCommercialCampaignBrief(
      campaign.briefJson
    );

  if (isCommercial) {
  const readiness =
    evaluateCommercialApprovalReadiness(
      campaign.assets,
      campaign.briefJson
    );

    if (!readiness.ready) {
      return {
        success: false,
        blocked: true,

        title:
          "Complete the launch materials before approving",

        message:
          `MarketForge found ${readiness.blockers.length} ${
            readiness.blockers.length === 1
              ? "material"
              : "materials"
          } that still need attention before this Commercial pursuit can begin.`,

        blockers:
          readiness.blockers,
      };
    }
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: "APPROVED",
    },
  });

  await notifyCampaignApproved(campaignId);

  if (isCommercial) {
    console.log(
      "[campaign-approval] skipped Residential snapshot refresh for Commercial action",
      {
        campaignId,
        workspaceId:
          campaign.workspaceId,
      }
    );
  } else {
    const refreshedSnapshot =
      await refreshWorkspaceOpportunitySnapshotFromDecisionCache(
        campaign.workspaceId
      );

    if (!refreshedSnapshot) {
      console.log(
        "[campaign-approval] decision cache unavailable; falling back to full snapshot invalidation",
        {
          campaignId,
          workspaceId:
            campaign.workspaceId,
        }
      );

      await invalidateWorkspaceOpportunitySnapshot(
        campaign.workspaceId
      );
    } else {
      console.log(
        "[campaign-approval] refreshed visible recommendations from decision cache",
        {
          campaignId,
          workspaceId:
            campaign.workspaceId,
          topOpportunityKey:
            refreshedSnapshot
              .topOpportunity
              .opportunityKey,
          backlogCount:
            refreshedSnapshot
              .backlogOpportunities
              .length,
        }
      );
    }
  }

  revalidateCampaignViews(
    campaignId
  );

  return {
    success: true,
  };
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

  console.log("[campaign-status] skipped snapshot invalidation for queue transition", {
    campaignId,
    workspaceId: campaign.workspaceId,
  });

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

export async function resetCampaignToReview(
  campaignId: string
) {
  const campaign =
    await prisma.campaign.findUnique({
      where: {
        id: campaignId,
      },

      select: {
        status: true,
        workspaceId: true,
        briefJson: true,
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

  const isCommercial =
    isCommercialCampaignBrief(
      campaign.briefJson
    );

  if (isCommercial) {
    console.log(
      "[campaign-review-reset] skipped Residential snapshot invalidation for Commercial action",
      {
        campaignId,
        workspaceId:
          campaign.workspaceId,
      }
    );
  } else {
    await invalidateWorkspaceOpportunitySnapshot(
      campaign.workspaceId
    );
  }

  revalidateCampaignViews(
    campaignId
  );
}

export async function saveCommercialReusableInputs(
  input: {
    campaignId: string;

    reusableInputs:
      CommercialReusableInputs;

    vendorReadiness:
      CommercialVendorReadiness;
  }
): Promise<SaveCommercialReusableInputsResult> {
  const campaign =
    await prisma.campaign.findUnique({
      where: {
        id:
          input.campaignId,
      },

      select: {
        id: true,
        status: true,
        briefJson: true,

        assets: {
          select: {
            id: true,
            content: true,
            metadataJson: true,
          },
        },
      },
    });

  if (!campaign) {
    return {
      success: false,
      error:
        "Action not found.",
    };
  }

  if (
    campaign.status ===
      "LAUNCHED" ||
    campaign.status ===
      "COMPLETED"
  ) {
    return {
      success: false,
      error:
        "Commercial details cannot be changed after launch.",
    };
  }

  try {
    const updated =
      applyPersistedCommercialReusableInputs({
        briefJson:
          campaign.briefJson,

        assets:
          campaign.assets,

        reusableInputs:
          input.reusableInputs,

        vendorReadiness:
          input.vendorReadiness,
      });

    await prisma.$transaction([
      prisma.campaign.update({
        where: {
          id:
            input.campaignId,
        },

        data: {
          audience:
            updated.campaignAudience,

          briefJson:
            updated.briefJson,

          qualityReviewStatus:
            "PENDING",
        },
      }),

      ...updated.assets.map(
        (asset) =>
          prisma.campaignAsset.update({
            where: {
              id:
                asset.id,
            },

            data: {
              content:
                asset.content,

              metadataJson:
                asset.metadataJson,

              isApproved:
                false,
            },
          })
      ),
    ]);

    revalidateCampaignViews(
      input.campaignId
    );

    return {
      success: true,

      updatedAssetCount:
        updated.assets.length,

      remainingReusableInputCount:
        updated
          .remainingReusableInputCount,
    };
  } catch (error) {
    console.error(
      "[commercial-reusable-input-save-failed]",
      {
        campaignId:
          input.campaignId,

        error,
      }
    );

    return {
      success: false,
      error:
        "MarketForge could not save the Commercial details.",
    };
  }
}