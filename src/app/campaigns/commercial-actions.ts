"use server";

import {
  auth,
} from "@clerk/nextjs/server";

import {
  AssetType,
  Prisma,
} from "@/generated/prisma";

import {
  prisma,
} from "@/lib/prisma";

import type {
  PromptReadinessResult,
} from "@/app/campaigns/actions";

import {
  buildCommercialActionSpec,
} from "@/lib/nlp/commercial/action-spec";

import {
  generateCommercialPursuitAssets,
} from "@/lib/nlp/commercial/assets";

import {
  interpretCommercialIntent,
} from "@/lib/nlp/commercial/intent";

import {
  resolveCommercialPromptReadiness,
} from "@/lib/nlp/commercial/readiness";

import {
  generateCommercialPursuitStrategy,
} from "@/lib/nlp/commercial/strategy";

import type {
  CommercialActionSpec,
  CommercialBusinessContext,
  CommercialPursuitAsset,
  CommercialPursuitAssetPackage,
  CommercialPursuitStrategy,
  InterpretedCommercialIntent,
} from "@/lib/nlp/commercial/types";

export type CreateCommercialActionResult =
  | {
      success: true;
      campaignId: string;
      campaignName: string;
    }
  | {
      success: false;
      error: string;
    }
  | {
      success: false;
      needsInput: true;
      title: string;
      message: string;
      requirements: string[];
      examplePrompt: string;
    };

type LoadedCommercialWorkspace = {
  workspaceId: string;
  businessContext: CommercialBusinessContext;
};

function uniqueNonEmptyStrings(
  values: Array<string | null | undefined>
) {
  return Array.from(
    new Set(
      values
        .map((value) =>
          value?.trim() ?? ""
        )
        .filter(Boolean)
    )
  );
}

function toJsonInput(
  value: unknown
): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(value)
  ) as Prisma.InputJsonValue;
}

function formatCommercialLabel(
  value: string
) {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    );
}

function resolvePersistedAssetType(
  asset: CommercialPursuitAsset
): AssetType {
  switch (asset.category) {
    case "INITIAL_OUTREACH":
    case "PHONE_SCRIPT":
    case "VOICEMAIL":
    case "DIRECT_MESSAGE":
    case "FOLLOW_UP":
      return "EMAIL";

    default:
      return "SEO";
  }
}

function buildPersistedAssetContent(
  asset: CommercialPursuitAsset
) {
  const sections =
    asset.sections
      .map((section) =>
        [
          section.heading.toUpperCase(),
          "",
          section.content.trim(),
        ].join("\n")
      )
      .join("\n\n");

  return [
    "PURPOSE",
    "",
    asset.purpose.trim(),

    sections,

    "HOW TO USE IT",
    "",
    asset.usageInstructions.trim(),

    "COMPLETE WHEN",
    "",
    asset.completionSignal.trim(),
  ]
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function buildCommercialBriefJson(params: {
  userPrompt: string;
  intent: InterpretedCommercialIntent;
  strategy: CommercialPursuitStrategy;
  actionSpec: CommercialActionSpec;
  assetPackage: CommercialPursuitAssetPackage;
}) {
  const {
    userPrompt,
    intent,
    strategy,
    actionSpec,
    assetPackage,
  } = params;

  return {
    origin:
      "nl_custom",

    market:
      "COMMERCIAL",

    strategyVersion:
      strategy.strategyVersion,

    generatedAt:
      assetPackage.generatedAt,

    userPrompt,

    interpretedIntent:
      intent,

    commercialStrategy:
      strategy,

    commercialActionSpec:
      actionSpec,

    commercialAssetPackage: {
      packageVersion:
        assetPackage.packageVersion,

      executiveSummary:
        assetPackage.executiveSummary,

      assetCount:
        assetPackage.assets.length,

      readyNowAssetIds:
        assetPackage.readyNowAssetIds,

      ownerInputRequiredAssetIds:
        assetPackage.ownerInputRequiredAssetIds,

      accountDiscoveryRequiredAssetIds:
        assetPackage.accountDiscoveryRequiredAssetIds,

      ownerInputRequirements:
        assetPackage.ownerInputRequirements,

      unresolvedAccountDiscoveryItems:
        assetPackage.unresolvedAccountDiscoveryItems,

      assumptions:
        assetPackage.assumptions,
    },

    displayMoveLabel:
      actionSpec.actionName,

    nextBestAction: {
      title:
        actionSpec.actionName,

      actionType:
        actionSpec.actionType,

      executionMode:
        "ACTION_PACK",
    },

    actionThesis: {
      title:
        actionSpec.actionName,

      summary:
        actionSpec.actionSummary,

      audience:
        actionSpec.target.displayLabel,

      offerHint:
        null,

      ctaHint:
        actionSpec.primaryCallToAction,

      whyThisActionBullets:
        actionSpec.successSignals,
    },

    campaignDraft: {
      description:
        actionSpec.actionSummary,

      offer:
        "",

      audience:
        actionSpec.target.displayLabel,

      cta:
        actionSpec.primaryCallToAction,
    },

    creativeGuidance: {
      recommendedImage:
        "Use the business logo or a professional commercial-service image relevant to the target account.",

      avoidImagery:
        "Avoid consumer promotional graphics, residential-only imagery, unsupported account branding, or imagery implying an existing vendor relationship.",
    },
  };
}

async function loadCommercialWorkspace(): Promise<
  | {
      success: true;
      value: LoadedCommercialWorkspace;
    }
  | {
      success: false;
      error: string;
    }
> {
  const {
    userId: clerkUserId,
  } = await auth();

  if (!clerkUserId) {
    return {
      success: false,
      error:
        "You must be signed in.",
    };
  }

  const appUser =
    await prisma.user.findUnique({
      where: {
        clerkUserId,
      },

      include: {
        workspaces: {
          include: {
            workspace: true,
          },

          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

  const workspace =
    appUser?.workspaces[0]
      ?.workspace;

  if (
    !workspace ||
    !workspace.onboardingCompletedAt
  ) {
    return {
      success: false,
      error:
        "Complete onboarding before generating actions.",
    };
  }

  const profile =
    await prisma.businessProfile.findUnique({
      where: {
        workspaceId:
          workspace.id,
      },
    });

  if (!profile) {
    return {
      success: false,
      error:
        "Business profile not found.",
    };
  }

  const pricedServices =
  Array.isArray(
    profile.servicePricingJson
  )
    ? profile.servicePricingJson.flatMap(
        (item) => {
          if (
            !item ||
            typeof item !== "object" ||
            Array.isArray(item)
          ) {
            return [];
          }

          const serviceName =
            (
              item as Record<
                string,
                unknown
              >
            ).serviceName;

          return typeof serviceName ===
            "string" &&
            serviceName.trim()
            ? [
                serviceName.trim(),
              ]
            : [];
        }
      )
    : [];

  const verifiedServices =
    uniqueNonEmptyStrings(
      profile.preferredServices.length >
        0
        ? profile.preferredServices
        : pricedServices
    );

  return {
    success: true,

    value: {
      workspaceId:
        workspace.id,

      businessContext: {
        businessName:
          profile.businessName,

        website:
          profile.website,

        phone:
          profile.phone,

        city:
          profile.city,

        state:
          profile.state,

        serviceArea:
          profile.serviceArea,

        industryLabel:
          profile.industryLabel,

        verifiedServices,

        logoUrl:
          profile.logoUrl,
      },
    },
  };
}

async function generateCommercialPackage(params: {
  prompt: string;
  businessContext: CommercialBusinessContext;
}) {
  const {
    prompt,
    businessContext,
  } = params;

  const intent =
    interpretCommercialIntent(
      prompt
    );

  const strategy =
    await generateCommercialPursuitStrategy({
      userPrompt:
        prompt,

      intent,

      businessContext,
    });

  const actionSpec =
    buildCommercialActionSpec({
      ownerPrompt:
        prompt,

      intent,

      strategy,
    });

  const assetPackage =
    await generateCommercialPursuitAssets({
      userPrompt:
        prompt,

      intent,

      strategy,

      actionSpec,

      businessContext,
    });

  return {
    intent,
    strategy,
    actionSpec,
    assetPackage,
  };
}

export async function validateCommercialActionPrompt(
  prompt: string
): Promise<PromptReadinessResult> {
  return resolveCommercialPromptReadiness(
    prompt
  );
}

export async function interpretCommercialActionPrompt(
  prompt: string
): Promise<InterpretedCommercialIntent> {
  const readiness =
    resolveCommercialPromptReadiness(
      prompt
    );

  if (!readiness.ready) {
    throw new Error(
      "Commercial prompt is not ready for interpretation."
    );
  }

  return interpretCommercialIntent(
    prompt
  );
}

export async function buildCommercialPursuitStrategy(
  prompt: string
): Promise<CommercialPursuitStrategy> {
  const readiness =
    resolveCommercialPromptReadiness(
      prompt
    );

  if (!readiness.ready) {
    throw new Error(
      "Commercial prompt is not ready for strategy generation."
    );
  }

  const workspaceResult =
    await loadCommercialWorkspace();

  if (!workspaceResult.success) {
    throw new Error(
      workspaceResult.error
    );
  }

  const intent =
    interpretCommercialIntent(
      prompt
    );

  return generateCommercialPursuitStrategy({
    userPrompt:
      prompt,

    intent,

    businessContext:
      workspaceResult.value
        .businessContext,
  });
}

export async function buildCommercialActionSpecFromPrompt(
  prompt: string
): Promise<CommercialActionSpec> {
  const readiness =
    resolveCommercialPromptReadiness(
      prompt
    );

  if (!readiness.ready) {
    throw new Error(
      "Commercial prompt is not ready for action-spec generation."
    );
  }

  const workspaceResult =
    await loadCommercialWorkspace();

  if (!workspaceResult.success) {
    throw new Error(
      workspaceResult.error
    );
  }

  const generated =
    await generateCommercialPackage({
      prompt,

      businessContext:
        workspaceResult.value
          .businessContext,
    });

  return generated.actionSpec;
}

export async function buildCommercialAssetPackageFromPrompt(
  prompt: string
): Promise<CommercialPursuitAssetPackage> {
  const readiness =
    resolveCommercialPromptReadiness(
      prompt
    );

  if (!readiness.ready) {
    throw new Error(
      "Commercial prompt is not ready for asset generation."
    );
  }

  const workspaceResult =
    await loadCommercialWorkspace();

  if (!workspaceResult.success) {
    throw new Error(
      workspaceResult.error
    );
  }

  const generated =
    await generateCommercialPackage({
      prompt,

      businessContext:
        workspaceResult.value
          .businessContext,
    });

  return generated.assetPackage;
}

/**
 * Pass 8:
 * Generate a Commercial action, persist it as a normal Campaign
 * with normal CampaignAsset records, and return the real campaign ID.
 *
 * Commercial generation remains isolated from the Residential
 * Revenue Engine, but both paths now enter the same review,
 * approval, execution, lead, and revenue lifecycle.
 */
export async function createCommercialActionFromPrompt(
  prompt: string
): Promise<CreateCommercialActionResult> {
  const cleanedPrompt =
    prompt.trim();

  const readiness =
    resolveCommercialPromptReadiness(
      cleanedPrompt
    );

  if (!readiness.ready) {
    return {
      success: false,
      needsInput: true,
      title:
        readiness.title,
      message:
        readiness.message,
      requirements:
        readiness.requirements,
      examplePrompt:
        readiness.examplePrompt,
    };
  }

  try {
    const workspaceResult =
      await loadCommercialWorkspace();

    if (!workspaceResult.success) {
      return {
        success: false,
        error:
          workspaceResult.error,
      };
    }

    const {
      workspaceId,
      businessContext,
    } = workspaceResult.value;

    const {
      intent,
      strategy,
      actionSpec,
      assetPackage,
    } =
      await generateCommercialPackage({
        prompt:
          cleanedPrompt,

        businessContext,
      });

    const briefJson =
      buildCommercialBriefJson({
        userPrompt:
          cleanedPrompt,

        intent,

        strategy,

        actionSpec,

        assetPackage,
      });

    const campaign =
      await prisma.campaign.create({
        data: {
          workspaceId,

          name:
            actionSpec.actionName,

          campaignType:
            "CUSTOM",

          targetService:
            actionSpec.targetService,

          offer:
            null,

          audience:
            actionSpec.target.displayLabel,

          serviceArea:
            businessContext.serviceArea,

          status:
            "READY",

          qualityReviewStatus:
            "PENDING",

          briefJson:
            toJsonInput(
              briefJson
            ),

          assets: {
            create:
              assetPackage.assets.map(
                (asset) => ({
                  assetType:
                    resolvePersistedAssetType(
                      asset
                    ),

                  title:
                    asset.title,

                  content:
                    buildPersistedAssetContent(
                      asset
                    ),

                  metadataJson:
                    toJsonInput({
                      market:
                        "COMMERCIAL",

                      commercialAssetId:
                        asset.id,

                      commercialCategory:
                        asset.category,

                      commercialCategoryLabel:
                        formatCommercialLabel(
                          asset.category
                        ),

                      readiness:
                        asset.readiness,

                      purpose:
                        asset.purpose,

                      requiredOwnerInputKeys:
                        asset.requiredOwnerInputKeys,

                      requiredAccountDiscoveryItems:
                        asset.requiredAccountDiscoveryItems,

                      sections:
                        asset.sections,

                      usageInstructions:
                        asset.usageInstructions,

                      completionSignal:
                        asset.completionSignal,

                      packageVersion:
                        assetPackage.packageVersion,

                      generatedAt:
                        assetPackage.generatedAt,
                    }),

                  isApproved:
                    false,
                })
              ),
          },
        },

        select: {
          id: true,
          name: true,
        },
      });

    return {
      success: true,
      campaignId:
        campaign.id,
      campaignName:
        campaign.name,
    };
  } catch (error) {
    console.error(
      "[commercial-action-persistence-failed]",
      error
    );

    return {
      success: false,
      error:
        "MarketForge generated the Commercial package but could not save the action. Please try again.",
    };
  }
}