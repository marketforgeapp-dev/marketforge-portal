import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import {
  ensureWorkspaceReputationFreshForWeek,
  type ReputationRefreshResult,
} from "@/lib/reputation-refresh";
import {
  type RevenueOpportunityHero,
  buildRevenueOpportunityHero,
  buildRevenueOpportunityEngine,
} from "@/lib/revenue-opportunity-engine";
import type { SelectedOpportunity } from "@/lib/select-revenue-opportunities";
import { selectRevenueOpportunities } from "@/lib/select-revenue-opportunities";
import { selectOpportunitySetWithAI } from "@/lib/ai-opportunity-set-selector";
import { getCampaignPerformanceSignals } from "@/lib/campaign-performance-signals";

const SNAPSHOT_COMPATIBILITY_EXPIRY_YEARS = 10;
const REQUIRED_VISIBLE_OPPORTUNITY_COUNT = 6;
const REQUIRED_BACKLOG_OPPORTUNITY_COUNT = 5;

export type WorkspaceOpportunitySnapshotPayload = {
  hero: RevenueOpportunityHero;
  topOpportunity: SelectedOpportunity;
  backlogOpportunities: SelectedOpportunity[];
  generatedAt: Date;
  fromCache: boolean;
};

export type WeeklyWorkspaceSignalRefreshResult = {
  workspaceId: string;
  elapsedMs: number;
  reputationRefresh: ReputationRefreshResult;
  snapshotInvalidated: boolean;
  invalidationReason: string | null;
};

const inFlightSnapshotBuilds = new Map<
  string,
  Promise<WorkspaceOpportunitySnapshotPayload>
>();

function getExpiryDate() {
  const expiresAt = new Date();
  expiresAt.setFullYear(
    expiresAt.getFullYear() + SNAPSHOT_COMPATIBILITY_EXPIRY_YEARS
  );
  return expiresAt;
}

function isSnapshotUsable(snapshot: {
  invalidatedAt: Date | null;
}) {
  return !snapshot.invalidatedAt;
}

function elapsedMs(startedAt: number) {
  return Date.now() - startedAt;
}

function logSnapshotTiming(
  label: string,
  input: {
    workspaceId: string;
    startedAt: number;
    extra?: Record<string, unknown>;
  }
) {
  console.log(`[snapshot] ${label}`, {
    workspaceId: input.workspaceId,
    elapsedMs: elapsedMs(input.startedAt),
    ...(input.extra ?? {}),
  });
}

function parseHero(value: unknown): RevenueOpportunityHero {
  return value as RevenueOpportunityHero;
}

function parseTopOpportunity(value: unknown): SelectedOpportunity {
  return value as SelectedOpportunity;
}

function parseBacklog(value: unknown): SelectedOpportunity[] {
  if (!Array.isArray(value)) return [];
  return value as SelectedOpportunity[];
}

function parseDecisionSpace(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value as Awaited<
    ReturnType<typeof buildRevenueOpportunityEngine>
  >["rankedOpportunities"];
}

function uniqueByOpportunityKey(
  opportunities: SelectedOpportunity[]
): SelectedOpportunity[] {
  const seen = new Set<string>();
  const output: SelectedOpportunity[] = [];

  for (const opportunity of opportunities) {
    if (seen.has(opportunity.opportunityKey)) {
      continue;
    }

    seen.add(opportunity.opportunityKey);
    output.push(opportunity);
  }

  return output;
}

function buildFastVisibleSetFromCachedDecisionSpace(params: {
  previousVisibleSet: SelectedOpportunity[];
  rankedSelection: SelectedOpportunity[];
  aiCandidatePool: SelectedOpportunity[];
}): SelectedOpportunity[] {
  const rankedByKey = new Map(
    params.rankedSelection.map((opportunity) => [
      opportunity.opportunityKey,
      opportunity,
    ])
  );

  const output: SelectedOpportunity[] = [];
  const usedKeys = new Set<string>();
  const usedFamilies = new Set<string>();

  function canUse(opportunity: SelectedOpportunity) {
    if (usedKeys.has(opportunity.opportunityKey)) return false;
    if (usedFamilies.has(opportunity.familyKey)) return false;
    if (opportunity.isInExecution) return false;
    if (opportunity.isDeprioritized) return false;
    if (opportunity.finalSurface === "suppress") return false;
    return true;
  }

  function push(opportunity: SelectedOpportunity) {
    if (!canUse(opportunity)) return;

    output.push(opportunity);
    usedKeys.add(opportunity.opportunityKey);
    usedFamilies.add(opportunity.familyKey);
  }

  for (const previousOpportunity of params.previousVisibleSet) {
    const refreshed = rankedByKey.get(previousOpportunity.opportunityKey);

    if (refreshed) {
      push(refreshed);
    }
  }

  for (const candidate of params.aiCandidatePool) {
    if (output.length >= REQUIRED_VISIBLE_OPPORTUNITY_COUNT) break;

    const refreshed = rankedByKey.get(candidate.opportunityKey) ?? candidate;
    push(refreshed);
  }

  for (const candidate of params.rankedSelection) {
    if (output.length >= REQUIRED_VISIBLE_OPPORTUNITY_COUNT) break;
    push(candidate);
  }

  return output.slice(0, REQUIRED_VISIBLE_OPPORTUNITY_COUNT);
}

function uniqueByFamilyKey(
  opportunities: SelectedOpportunity[]
): SelectedOpportunity[] {
  const seen = new Set<string>();
  const output: SelectedOpportunity[] = [];

  for (const opportunity of opportunities) {
    if (seen.has(opportunity.familyKey)) {
      continue;
    }

    seen.add(opportunity.familyKey);
    output.push(opportunity);
  }

  return output;
}

function buildAiCandidatePool(params: {
  engineOpportunities: Awaited<
    ReturnType<typeof buildRevenueOpportunityEngine>
  >["rankedOpportunities"];
  rankedSelection: SelectedOpportunity[];
}): SelectedOpportunity[] {
  const { engineOpportunities, rankedSelection } = params;

  const executionMap = new Map(
    rankedSelection.map((opportunity) => [
      opportunity.opportunityKey,
      {
        isInExecution: opportunity.isInExecution,
        linkedCampaignId: opportunity.linkedCampaignId,
        linkedCampaignStatus: opportunity.linkedCampaignStatus,
        suppressionReason: opportunity.suppressionReason,
      },
    ])
  );

  const eligibleFromEngine = engineOpportunities
    .filter(
      (opportunity) =>
        !opportunity.isDeprioritized &&
        opportunity.finalSurface !== "suppress"
    )
    .map((opportunity) => {
      const executionState = executionMap.get(opportunity.opportunityKey);

      return {
        ...opportunity,
        linkedCampaignId: executionState?.linkedCampaignId ?? null,
        linkedCampaignStatus: executionState?.linkedCampaignStatus ?? null,
        isInExecution: executionState?.isInExecution ?? false,
        adjustedScore: opportunity.finalRecommendationScore,
        suppressionReason: executionState?.suppressionReason ?? null,
      };
    })
    .filter((opportunity) => !opportunity.isInExecution);

  const deduped = uniqueByOpportunityKey(eligibleFromEngine);

  const pool: SelectedOpportunity[] = [];
  const usedFamilies = new Set<string>();

  // First pass: one per family, broad pool
  for (const opportunity of deduped) {
    if (pool.length >= 18) break;
    if (usedFamilies.has(opportunity.familyKey)) continue;

    pool.push(opportunity);
    usedFamilies.add(opportunity.familyKey);
  }

  // Second pass: allow additional strong variants if still short
  for (const opportunity of deduped) {
    if (pool.length >= 18) break;
    if (pool.some((item) => item.opportunityKey === opportunity.opportunityKey)) {
      continue;
    }

    pool.push(opportunity);
  }

  return pool.slice(0, 18);
}

function materializeAiVisibleSet(params: {
  aiCandidatePool: SelectedOpportunity[];
  heroOpportunityKey: string;
  visibleOpportunityKeys: string[];
}): SelectedOpportunity[] {
  const candidateMap = new Map(
    params.aiCandidatePool.map((opportunity) => [
      opportunity.opportunityKey,
      opportunity,
    ])
  );

  const orderedVisible = params.visibleOpportunityKeys
    .map((key) => candidateMap.get(key))
    .filter(Boolean) as SelectedOpportunity[];

  const dedupedVisible = uniqueByOpportunityKey(orderedVisible);

  const hero =
    candidateMap.get(params.heroOpportunityKey) ?? dedupedVisible[0] ?? null;

  if (!hero) {
    return [];
  }

  const filled = uniqueByOpportunityKey([
    hero,
    ...dedupedVisible.filter(
      (opportunity) => opportunity.opportunityKey !== hero.opportunityKey
    ),
    ...params.aiCandidatePool.filter(
      (opportunity) =>
        opportunity.opportunityKey !== hero.opportunityKey &&
        !dedupedVisible.some(
          (item) => item.opportunityKey === opportunity.opportunityKey
        )
    ),
  ]);

  return filled.slice(0, 6);
}

function countDemandShape(
  opportunities: SelectedOpportunity[],
  shape: string
): number {
  return opportunities.filter((opportunity) => opportunity.demandShape === shape)
    .length;
}

function pickBestReplacement(params: {
  currentSet: SelectedOpportunity[];
  aiCandidatePool: SelectedOpportunity[];
  excludedKeys: Set<string>;
  preferredShape?: string;
  disallowedShapes?: Set<string>;
}): SelectedOpportunity | null {
  const allowedCandidates = params.aiCandidatePool.filter((candidate) => {
    if (params.excludedKeys.has(candidate.opportunityKey)) return false;
    if (
      params.disallowedShapes &&
      params.disallowedShapes.has(candidate.demandShape)
    ) {
      return false;
    }

    return true;
  });

  if (params.preferredShape) {
    const preferred = allowedCandidates.find(
      (candidate) => candidate.demandShape === params.preferredShape
    );

    if (preferred) {
      return preferred;
    }
  }

  const fallbackShapeOrder = [
    "everyday-core",
    "schedule-fill",
    "visibility",
    "high-value-narrow",
    "urgent-problem",
  ];

  for (const shape of fallbackShapeOrder) {
    const match = allowedCandidates.find(
      (candidate) => candidate.demandShape === shape
    );

    if (match) {
      return match;
    }
  }

  return allowedCandidates[0] ?? null;
}

function repairAiVisibleSet(params: {
  visibleSet: SelectedOpportunity[];
  aiCandidatePool: SelectedOpportunity[];
}): SelectedOpportunity[] {
  const repaired = [...params.visibleSet];

  const availableEverydayCore = params.aiCandidatePool.filter(
    (opportunity) => opportunity.demandShape === "everyday-core"
  );

  const availableVisibility = params.aiCandidatePool.filter(
    (opportunity) => opportunity.demandShape === "visibility"
  );

  const availableHighValueNarrow = params.aiCandidatePool.filter(
    (opportunity) => opportunity.demandShape === "high-value-narrow"
  );

  const getExcludedKeys = () =>
    new Set(repaired.map((opportunity) => opportunity.opportunityKey));

  function replaceAt(index: number, replacement: SelectedOpportunity | null) {
    if (!replacement) return;
    repaired[index] = replacement;
  }

  // Rule 1: max 2 urgent-problem
  while (countDemandShape(repaired, "urgent-problem") > 2) {
    const indexToReplace = repaired.findIndex(
      (opportunity, index) =>
        index > 0 && opportunity.demandShape === "urgent-problem"
    );

    if (indexToReplace === -1) break;

    const replacement = pickBestReplacement({
      currentSet: repaired,
      aiCandidatePool: params.aiCandidatePool,
      excludedKeys: getExcludedKeys(),
      disallowedShapes: new Set(["urgent-problem"]),
    });

    if (!replacement) break;
    replaceAt(indexToReplace, replacement);
  }

  // Rule 2: max 1 high-value-narrow
  while (countDemandShape(repaired, "high-value-narrow") > 1) {
    const indexToReplace = repaired.findIndex(
      (opportunity) => opportunity.demandShape === "high-value-narrow"
    );

    if (indexToReplace === -1) break;

    const replacement = pickBestReplacement({
      currentSet: repaired,
      aiCandidatePool: params.aiCandidatePool,
      excludedKeys: getExcludedKeys(),
      disallowedShapes: new Set(["high-value-narrow"]),
    });

    if (!replacement) break;
    replaceAt(indexToReplace, replacement);
  }

  // Rule 3: max 1 visibility
  while (countDemandShape(repaired, "visibility") > 1) {
    const indexToReplace = repaired.findIndex(
      (opportunity) => opportunity.demandShape === "visibility"
    );

    if (indexToReplace === -1) break;

    const replacement = pickBestReplacement({
      currentSet: repaired,
      aiCandidatePool: params.aiCandidatePool,
      excludedKeys: getExcludedKeys(),
      disallowedShapes: new Set(["visibility"]),
    });

    if (!replacement) break;
    replaceAt(indexToReplace, replacement);
  }

  // Rule 4: require at least 2 everyday-core if available
  const targetEverydayCore = Math.min(2, availableEverydayCore.length);

  while (countDemandShape(repaired, "everyday-core") < targetEverydayCore) {
    const indexToReplace = repaired.findIndex(
      (opportunity, index) =>
        index > 0 &&
        opportunity.demandShape !== "everyday-core" &&
        opportunity.demandShape !== "visibility"
    );

    if (indexToReplace === -1) break;

    const replacement = pickBestReplacement({
      currentSet: repaired,
      aiCandidatePool: params.aiCandidatePool,
      excludedKeys: getExcludedKeys(),
      preferredShape: "everyday-core",
    });

    if (!replacement) break;
    replaceAt(indexToReplace, replacement);
  }

  // Deduplicate in case a replacement collided
    // Deduplicate by exact key first, then hard-dedupe by family
  const dedupedByKey = uniqueByOpportunityKey(repaired);
  const deduped = uniqueByFamilyKey(dedupedByKey);

  // Backfill to 6 if deduping shrank the set
  if (deduped.length < 6) {
    for (const candidate of params.aiCandidatePool) {
      if (deduped.length >= 6) break;
      if (
        deduped.some(
          (opportunity) =>
            opportunity.opportunityKey === candidate.opportunityKey ||
            opportunity.familyKey === candidate.familyKey
        )
      ) {
        continue;
      }

      deduped.push(candidate);
    }
  }

  return deduped.slice(0, 6);
}

export async function refreshWorkspaceOpportunitySnapshotFromDecisionCache(
  workspaceId: string
): Promise<WorkspaceOpportunitySnapshotPayload | null> {
  const startedAt = Date.now();

  const existing = await prisma.workspaceOpportunitySnapshot.findUnique({
    where: { workspaceId },
  });

  if (!existing?.decisionSpaceJson) {
    console.log("[snapshot] DECISION CACHE MISS", {
      workspaceId,
    });

    return null;
  }

  const decisionSpace = parseDecisionSpace(existing.decisionSpaceJson);

  if (decisionSpace.length === 0) {
    console.log("[snapshot] DECISION CACHE EMPTY", {
      workspaceId,
    });

    return null;
  }

  const [competitors, campaigns] = await Promise.all([
    prisma.competitor.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.campaign.findMany({
      where: { workspaceId },
      select: {
        id: true,
        campaignType: true,
        status: true,
        targetService: true,
        briefJson: true,
        updatedAt: true,
      },
    }),
  ]);

  const availableJobsEstimate =
    typeof existing.availableJobsEstimate === "number"
      ? existing.availableJobsEstimate
      : 0;

  const selection = selectRevenueOpportunities({
    opportunities: decisionSpace,
    campaigns,
    availableJobsEstimate,
    competitors,
  });

  const aiCandidatePool = buildAiCandidatePool({
    engineOpportunities: decisionSpace,
    rankedSelection: selection.rankedSelection,
  });

  const previousVisibleSet = [
    parseTopOpportunity(existing.topOpportunityJson),
    ...parseBacklog(existing.backlogJson),
  ].filter(Boolean);

  const visibleSet = buildFastVisibleSetFromCachedDecisionSpace({
    previousVisibleSet,
    rankedSelection: selection.rankedSelection,
    aiCandidatePool,
  });

  if (visibleSet.length < REQUIRED_VISIBLE_OPPORTUNITY_COUNT) {
    console.warn("[snapshot] DECISION CACHE REFRESH UNDERPOPULATED", {
      workspaceId,
      visibleSetCount: visibleSet.length,
      requiredVisibleCount: REQUIRED_VISIBLE_OPPORTUNITY_COUNT,
      decisionSpaceCount: decisionSpace.length,
      rankedSelectionCount: selection.rankedSelection.length,
      aiCandidatePoolCount: aiCandidatePool.length,
    });

    return null;
  }

  const finalTopOpportunity = visibleSet[0];
  const finalBacklogOpportunities = visibleSet.slice(
    1,
    REQUIRED_VISIBLE_OPPORTUNITY_COUNT
  );

  const finalHero = buildRevenueOpportunityHero({
    opportunity: finalTopOpportunity,
    availableJobsEstimate,
    competitors,
  });

  const generatedAt = new Date();

  const payload: WorkspaceOpportunitySnapshotPayload = {
    hero: finalHero,
    topOpportunity: finalTopOpportunity,
    backlogOpportunities: finalBacklogOpportunities,
    generatedAt,
    fromCache: false,
  };

  if (
    finalBacklogOpportunities.length < REQUIRED_BACKLOG_OPPORTUNITY_COUNT
  ) {
    console.warn("[snapshot] DECISION CACHE REFRESH BACKLOG SHORTFALL", {
      workspaceId,
      backlogCount: finalBacklogOpportunities.length,
      requiredBacklogCount: REQUIRED_BACKLOG_OPPORTUNITY_COUNT,
      topOpportunityKey: finalTopOpportunity.opportunityKey,
    });

    return null;
  }

  await prisma.workspaceOpportunitySnapshot.update({
    where: { workspaceId },
    data: {
      snapshotVersion: { increment: 1 },
      heroJson: payload.hero,
      topOpportunityJson: payload.topOpportunity,
      backlogJson: payload.backlogOpportunities,
      aiCandidatePoolJson:
        aiCandidatePool as unknown as Prisma.InputJsonValue,
      generatedAt: payload.generatedAt,
      expiresAt: getExpiryDate(),
      invalidatedAt: null,
    },
  });

  console.log("[snapshot] DECISION CACHE REFRESH COMPLETE", {
    workspaceId,
    elapsedMs: Date.now() - startedAt,
    topOpportunityKey: payload.topOpportunity.opportunityKey,
    backlogCount: payload.backlogOpportunities.length,
    visibleSetCount: 1 + payload.backlogOpportunities.length,
    requiredVisibleCount: REQUIRED_VISIBLE_OPPORTUNITY_COUNT,
    decisionSpaceCount: decisionSpace.length,
    rankedSelectionCount: selection.rankedSelection.length,
    aiCandidatePoolCount: aiCandidatePool.length,
  });

  return payload;
}

export async function refreshWeeklyWorkspaceSignals(
  workspaceId: string
): Promise<WeeklyWorkspaceSignalRefreshResult> {
  const startedAt = Date.now();

  const reputationRefresh = await ensureWorkspaceReputationFreshForWeek(
    workspaceId
  );

  let snapshotInvalidated = false;
  let invalidationReason: string | null = null;

  if (
    reputationRefresh.status === "completed" &&
    reputationRefresh.materialChangeLikely
  ) {
    await invalidateWorkspaceOpportunitySnapshot(workspaceId);

    snapshotInvalidated = true;
    invalidationReason = "material_reputation_change";
  }

  const result: WeeklyWorkspaceSignalRefreshResult = {
    workspaceId,
    elapsedMs: Date.now() - startedAt,
    reputationRefresh,
    snapshotInvalidated,
    invalidationReason,
  };

  console.log("[snapshot] WEEKLY SIGNAL REFRESH COMPLETE", {
    workspaceId,
    elapsedMs: result.elapsedMs,
    reputationRefreshStatus: reputationRefresh.status,
    googleMetricsFetchCount: reputationRefresh.googleMetricsFetchCount,
    businessMetricsChanged: reputationRefresh.businessMetricsChanged,
    competitorMetricsChangedCount:
      reputationRefresh.competitorMetricsChangedCount,
    competitorMetricsCheckedCount:
      reputationRefresh.competitorMetricsCheckedCount,
    materialChangeLikely: reputationRefresh.materialChangeLikely,
    snapshotInvalidated,
    invalidationReason,
  });

  return result;
}

export async function invalidateWorkspaceOpportunitySnapshot(
  workspaceId: string
) {
  await prisma.workspaceOpportunitySnapshot.updateMany({
    where: { workspaceId },
    data: {
      invalidatedAt: new Date(),
    },
  });
}

export async function getOrCreateWorkspaceOpportunitySnapshot(
  workspaceId: string
): Promise<WorkspaceOpportunitySnapshotPayload> {
  const existing = await prisma.workspaceOpportunitySnapshot.findUnique({
    where: { workspaceId },
  });

  const snapshotIsFresh = !!existing && isSnapshotUsable(existing);

if (snapshotIsFresh && existing) {
  console.log("[snapshot] USING STORED SNAPSHOT", {
    workspaceId,
    generatedAt: existing.generatedAt,
    snapshotVersion: existing.snapshotVersion,
    expiresAt: existing.expiresAt,
    ttlIgnored: true,
  });

    return {
      hero: parseHero(existing.heroJson),
      topOpportunity: parseTopOpportunity(existing.topOpportunityJson),
      backlogOpportunities: parseBacklog(existing.backlogJson),
      generatedAt: existing.generatedAt,
      fromCache: true,
    };
  }

  const existingInFlight = inFlightSnapshotBuilds.get(workspaceId);

  if (existingInFlight) {
    console.log("[snapshot] REUSING IN-FLIGHT BUILD", { workspaceId });
    return existingInFlight;
  }

  const buildPromise: Promise<WorkspaceOpportunitySnapshotPayload> =
  (async () => {
    const buildStartedAt = Date.now();

    try {
      console.log("[snapshot] BUILD START", {
        workspaceId,
        hasExistingSnapshot: Boolean(existing),
        invalidatedAt: existing?.invalidatedAt ?? null,
        generatedAt: existing?.generatedAt ?? null,
      });
        try {
        const reputationStartedAt = Date.now();

        console.log("[snapshot] BEFORE reputation refresh", { workspaceId });

        const reputationRefreshResult =
          await ensureWorkspaceReputationFreshForWeek(workspaceId);

        logSnapshotTiming("AFTER reputation refresh", {
          workspaceId,
          startedAt: reputationStartedAt,
          extra: {
            reputationRefreshStatus: reputationRefreshResult.status,
            googleMetricsFetchCount: reputationRefreshResult.googleMetricsFetchCount,
            businessMetricsChanged: reputationRefreshResult.businessMetricsChanged,
            competitorMetricsChangedCount:
              reputationRefreshResult.competitorMetricsChangedCount,
            competitorMetricsCheckedCount:
              reputationRefreshResult.competitorMetricsCheckedCount,
            materialChangeLikely: reputationRefreshResult.materialChangeLikely,
          },
        });
      } catch (error) {
          console.error("Weekly workspace reputation refresh failed", {
            workspaceId,
            error,
          });
        }

        const profileStartedAt = Date.now();

        const profile = await prisma.businessProfile.findUnique({
          where: { workspaceId },
        });

        logSnapshotTiming("AFTER profile load", {
          workspaceId,
          startedAt: profileStartedAt,
        });

        if (!profile) {
          throw new Error(
            "Business profile not found for opportunity snapshot."
          );
        }
        const dependencyLoadStartedAt = Date.now();
        const [competitors, campaigns, performanceSignals] = await Promise.all([
          prisma.competitor.findMany({
            where: { workspaceId },
            orderBy: { createdAt: "asc" },
          }),
          prisma.campaign.findMany({
            where: { workspaceId },
            select: {
              id: true,
              campaignType: true,
              status: true,
              targetService: true,
              briefJson: true,
              updatedAt: true,
            },
          }),
          getCampaignPerformanceSignals(workspaceId),
        ]);
        logSnapshotTiming("AFTER dependency load", {
        workspaceId,
        startedAt: dependencyLoadStartedAt,
        extra: {
          competitorCount: competitors.length,
          campaignCount: campaigns.length,
        },
      });

        const engineStartedAt = Date.now();

        const engine = await buildRevenueOpportunityEngine({
          profile,
          competitors,
          performanceSignals,
        });

        logSnapshotTiming("AFTER engine build", {
          workspaceId,
          startedAt: engineStartedAt,
          extra: {
            rankedOpportunityCount: engine.rankedOpportunities.length,
          },
        });
        const selectionStartedAt = Date.now();
        const selection = selectRevenueOpportunities({
          opportunities: engine.rankedOpportunities,
          campaigns,
          availableJobsEstimate: engine.availableJobsEstimate,
          competitors,
        });

        const aiCandidatePool = buildAiCandidatePool({
          engineOpportunities: engine.rankedOpportunities,
          rankedSelection: selection.rankedSelection,
        });

                console.log("[snapshot] AI CANDIDATE POOL", {
          workspaceId,
          count: aiCandidatePool.length,
          opportunities: aiCandidatePool.map((opportunity) => ({
            opportunityKey: opportunity.opportunityKey,
            title: opportunity.displayMoveLabel,
            familyKey: opportunity.familyKey,
            demandShape: opportunity.demandShape,
            finalSurface: opportunity.finalSurface,
            actionFraming: opportunity.actionFraming,
          })),
        });
        const aiSelectionStartedAt = Date.now();
        const aiSelection = await selectOpportunitySetWithAI({
          profile: {
            businessName: profile.businessName,
            industryLabel: profile.industryLabel,
            city: profile.city,
            state: profile.state,
            serviceArea: profile.serviceArea,
            averageJobValue: profile.averageJobValue,
            preferredServices: profile.preferredServices,
            deprioritizedServices: profile.deprioritizedServices,
            highestMarginService: profile.highestMarginService,
            lowestPriorityService: profile.lowestPriorityService,
            weeklyCapacity: profile.weeklyCapacity,
            technicians: profile.technicians,
            googleRating: profile.googleRating,
            googleReviewCount: profile.googleReviewCount,
            hasFaqContent: profile.hasFaqContent,
            hasServicePages: profile.hasServicePages,
            hasGoogleBusinessPage: profile.hasGoogleBusinessPage,
            aeoReadinessScore: profile.aeoReadinessScore,
          },
          candidates: aiCandidatePool,
          competitors,
          targetVisibleCount: 6,
        });
        logSnapshotTiming("AFTER AI selection", {
        workspaceId,
        startedAt: aiSelectionStartedAt,
        extra: {
          aiSelectionReturned: Boolean(aiSelection),
        },
      });
        let finalTopOpportunity = selection.topOpportunity;
        let finalBacklogOpportunities = selection.backlogOpportunities;
        let finalHero = selection.hero;

                if (aiSelection) {
          const materializedVisibleSet = materializeAiVisibleSet({
            aiCandidatePool,
            heroOpportunityKey: aiSelection.heroOpportunityKey,
            visibleOpportunityKeys: aiSelection.visibleOpportunityKeys,
          });

          const repairedVisibleSet = repairAiVisibleSet({
            visibleSet: materializedVisibleSet,
            aiCandidatePool,
          });

          console.log("[snapshot] AI SELECTION", {
            workspaceId,
            heroOpportunityKey: aiSelection.heroOpportunityKey,
            visibleOpportunityKeys: aiSelection.visibleOpportunityKeys,
            reasoning: aiSelection.reasoning,
            materializedVisibleSet: materializedVisibleSet.map((opportunity) => ({
              opportunityKey: opportunity.opportunityKey,
              title: opportunity.displayMoveLabel,
              familyKey: opportunity.familyKey,
              demandShape: opportunity.demandShape,
              finalSurface: opportunity.finalSurface,
              actionFraming: opportunity.actionFraming,
            })),
            repairedVisibleSet: repairedVisibleSet.map((opportunity) => ({
              opportunityKey: opportunity.opportunityKey,
              title: opportunity.displayMoveLabel,
              familyKey: opportunity.familyKey,
              demandShape: opportunity.demandShape,
              finalSurface: opportunity.finalSurface,
              actionFraming: opportunity.actionFraming,
            })),
          });

          if (repairedVisibleSet.length > 0) {
            finalTopOpportunity = repairedVisibleSet[0];
            finalBacklogOpportunities = repairedVisibleSet.slice(1, 6);
            finalHero = buildRevenueOpportunityHero({
              opportunity: finalTopOpportunity,
              availableJobsEstimate: engine.availableJobsEstimate,
              competitors,
            });
          }
        }

        const generatedAt = new Date();

        const decisionSpaceJson =
          engine.rankedOpportunities as unknown as Prisma.InputJsonValue;

        const aiCandidatePoolJson =
          aiCandidatePool as unknown as Prisma.InputJsonValue;

        const payload: WorkspaceOpportunitySnapshotPayload = {
          hero: finalHero,
          topOpportunity: finalTopOpportunity,
          backlogOpportunities: finalBacklogOpportunities,
          generatedAt,
          fromCache: false,
        };

        console.log("[snapshot] FINAL SAVED SET", {
          workspaceId,
          topOpportunity: {
            opportunityKey: payload.topOpportunity.opportunityKey,
            title: payload.topOpportunity.displayMoveLabel,
            familyKey: payload.topOpportunity.familyKey,
            demandShape: payload.topOpportunity.demandShape,
            finalSurface: payload.topOpportunity.finalSurface,
          },
          backlogOpportunities: payload.backlogOpportunities.map((opportunity) => ({
            opportunityKey: opportunity.opportunityKey,
            title: opportunity.displayMoveLabel,
            familyKey: opportunity.familyKey,
            demandShape: opportunity.demandShape,
            finalSurface: opportunity.finalSurface,
          })),
        });
        const persistStartedAt = Date.now();
        await prisma.workspaceOpportunitySnapshot.upsert({
          where: { workspaceId },
          update: {
            snapshotVersion: { increment: 1 },
            heroJson: payload.hero,
            topOpportunityJson: payload.topOpportunity,
            backlogJson: payload.backlogOpportunities,
            decisionSpaceJson,
            aiCandidatePoolJson,
            availableJobsEstimate: engine.availableJobsEstimate,
            decisionSpaceGeneratedAt: payload.generatedAt,
            generatedAt: payload.generatedAt,
            expiresAt: getExpiryDate(),
            invalidatedAt: null,
          },
          create: {
            workspaceId,
            heroJson: payload.hero,
            topOpportunityJson: payload.topOpportunity,
            backlogJson: payload.backlogOpportunities,
            decisionSpaceJson,
            aiCandidatePoolJson,
            availableJobsEstimate: engine.availableJobsEstimate,
            decisionSpaceGeneratedAt: payload.generatedAt,
            generatedAt: payload.generatedAt,
            expiresAt: getExpiryDate(),
            invalidatedAt: null,
          },
        });
        logSnapshotTiming("AFTER snapshot persist", {
        workspaceId,
        startedAt: persistStartedAt,
      });

      logSnapshotTiming("BUILD COMPLETE", {
        workspaceId,
        startedAt: buildStartedAt,
        extra: {
          topOpportunityKey: payload.topOpportunity.opportunityKey,
          backlogCount: payload.backlogOpportunities.length,
          decisionSpaceCached: true,
          decisionSpaceCount: engine.rankedOpportunities.length,
          aiCandidatePoolCount: aiCandidatePool.length,
        },
      });

        return payload;
      } finally {
        inFlightSnapshotBuilds.delete(workspaceId);
      }
    })();

  inFlightSnapshotBuilds.set(workspaceId, buildPromise);

  return buildPromise;
}