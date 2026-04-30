import { prisma } from "@/lib/prisma";
import { getGooglePlaceMetrics } from "@/lib/google-place-metrics";

export type ReputationRefreshResult = {
  status: "workspace_not_found" | "skipped_not_due" | "completed";
  workspaceId: string;
  startedAt: Date;
  completedAt: Date;
  elapsedMs: number;
  googleMetricsFetchCount: number;
  businessMetricsChanged: boolean;
  competitorMetricsChangedCount: number;
  competitorMetricsCheckedCount: number;
  materialChangeLikely: boolean;
};

function getStartOfCurrentWeek() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(now.getDate() - day);
  return start;
}

function metricsActuallyChanged(params: {
  currentRating: number | null;
  currentReviewCount: number | null;
  nextRating: number | null;
  nextReviewCount: number | null;
}) {
  return (
    params.currentRating !== params.nextRating ||
    params.currentReviewCount !== params.nextReviewCount
  );
}

function absoluteNumberDelta(
  currentValue: number | null,
  nextValue: number | null
): number {
  if (currentValue === null && nextValue === null) return 0;
  if (currentValue === null || nextValue === null) return Number.POSITIVE_INFINITY;

  return Math.abs(nextValue - currentValue);
}

function reviewCountDelta(
  currentReviewCount: number | null,
  nextReviewCount: number | null
): number {
  if (currentReviewCount === null && nextReviewCount === null) return 0;
  if (currentReviewCount === null || nextReviewCount === null) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.abs(nextReviewCount - currentReviewCount);
}

function metricChangeLooksMaterial(params: {
  currentRating: number | null;
  currentReviewCount: number | null;
  nextRating: number | null;
  nextReviewCount: number | null;
}) {
  const ratingDelta = absoluteNumberDelta(
    params.currentRating,
    params.nextRating
  );

  const reviewsDelta = reviewCountDelta(
    params.currentReviewCount,
    params.nextReviewCount
  );

  const currentReviewCount = params.currentReviewCount ?? 0;
  const reviewGrowthRatio =
    currentReviewCount > 0 ? reviewsDelta / currentReviewCount : reviewsDelta > 0 ? 1 : 0;

  return ratingDelta >= 0.2 || reviewsDelta >= 25 || reviewGrowthRatio >= 0.1;
}

function buildRefreshResult(params: {
  status: ReputationRefreshResult["status"];
  workspaceId: string;
  startedAt: Date;
  googleMetricsFetchCount?: number;
  businessMetricsChanged?: boolean;
  competitorMetricsChangedCount?: number;
  competitorMetricsCheckedCount?: number;
  materialChangeLikely?: boolean;
}): ReputationRefreshResult {
  const completedAt = new Date();

  return {
    status: params.status,
    workspaceId: params.workspaceId,
    startedAt: params.startedAt,
    completedAt,
    elapsedMs: completedAt.getTime() - params.startedAt.getTime(),
    googleMetricsFetchCount: params.googleMetricsFetchCount ?? 0,
    businessMetricsChanged: params.businessMetricsChanged ?? false,
    competitorMetricsChangedCount: params.competitorMetricsChangedCount ?? 0,
    competitorMetricsCheckedCount: params.competitorMetricsCheckedCount ?? 0,
    materialChangeLikely: params.materialChangeLikely ?? false,
  };
}

export async function ensureWorkspaceReputationFreshForWeek(
  workspaceId: string
): Promise<ReputationRefreshResult> {
  const startedAt = new Date();

  let googleMetricsFetchCount = 0;
  let businessMetricsChanged = false;
  let competitorMetricsChangedCount = 0;
  let competitorMetricsCheckedCount = 0;
  let materialChangeLikely = false;

  console.log("[reputation-refresh] START", { workspaceId });

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      lastReputationRefreshAt: true,
    },
  });

  if (!workspace) {
  console.log("[reputation-refresh] WORKSPACE NOT FOUND", { workspaceId });

  return buildRefreshResult({
      status: "workspace_not_found",
      workspaceId,
      startedAt,
    });
  }

  const startOfWeek = getStartOfCurrentWeek();

  if (
    workspace.lastReputationRefreshAt &&
    workspace.lastReputationRefreshAt >= startOfWeek
  ) {
    const result = buildRefreshResult({
      status: "skipped_not_due",
      workspaceId,
      startedAt,
    });

    console.log("[reputation-refresh] SKIP weekly gate", {
      workspaceId,
      lastReputationRefreshAt: workspace.lastReputationRefreshAt,
      result,
    });

    return result;
  }

  console.log("[reputation-refresh] RUN weekly refresh", {
    workspaceId,
    lastReputationRefreshAt: workspace.lastReputationRefreshAt,
  });

  const businessProfile = await prisma.businessProfile.findUnique({
    where: { workspaceId },
    select: {
      id: true,
      googlePlaceId: true,
      googleRating: true,
      googleReviewCount: true,
    },
  });

  if (businessProfile?.googlePlaceId) {
    console.log("[reputation-refresh] BUSINESS metrics fetch", {
      workspaceId,
      googlePlaceId: businessProfile.googlePlaceId,
    });

    try {
      googleMetricsFetchCount += 1;

      const latestBusinessMetrics = await getGooglePlaceMetrics(
        businessProfile.googlePlaceId
      );

      const nextBusinessRating =
        latestBusinessMetrics.rating ?? businessProfile.googleRating ?? null;

      const nextBusinessReviewCount =
        latestBusinessMetrics.reviewCount ??
        businessProfile.googleReviewCount ??
        null;

      const businessChanged = metricsActuallyChanged({
        currentRating: businessProfile.googleRating ?? null,
        currentReviewCount: businessProfile.googleReviewCount ?? null,
        nextRating: nextBusinessRating,
        nextReviewCount: nextBusinessReviewCount,
      });

      businessMetricsChanged = businessMetricsChanged || businessChanged;

      if (
        metricChangeLooksMaterial({
          currentRating: businessProfile.googleRating ?? null,
          currentReviewCount: businessProfile.googleReviewCount ?? null,
          nextRating: nextBusinessRating,
          nextReviewCount: nextBusinessReviewCount,
        })
      ) {
        materialChangeLikely = true;
      }

      const updatedBusinessProfile = await prisma.businessProfile.update({
        where: { workspaceId },
        data: {
          googleRating: nextBusinessRating,
          googleReviewCount: nextBusinessReviewCount,
          lastReputationEnrichedAt: new Date(),
        },
        select: {
          id: true,
          googleRating: true,
          googleReviewCount: true,
        },
      });

      if (businessChanged) {
        await prisma.businessReputationSnapshot.create({
          data: {
            workspaceId,
            businessProfileId: updatedBusinessProfile.id,
            rating: updatedBusinessProfile.googleRating,
            reviewCount: updatedBusinessProfile.googleReviewCount,
          },
        });
      }

      competitorMetricsCheckedCount += 1;
      console.log("[reputation-refresh] BUSINESS metrics updated", {
        workspaceId,
        googlePlaceId: businessProfile.googlePlaceId,
        rating: updatedBusinessProfile.googleRating,
        reviewCount: updatedBusinessProfile.googleReviewCount,
        changed: businessChanged,
      });
    } catch (error) {
      console.error("Business reputation refresh failed", {
        workspaceId,
        error,
      });
    }
  } else {
    console.log("[reputation-refresh] BUSINESS metrics skipped - no googlePlaceId", {
      workspaceId,
    });
  }

  const competitors = await prisma.competitor.findMany({
    where: { workspaceId },
    select: {
      id: true,
      googlePlaceId: true,
      rating: true,
      reviewCount: true,
    },
  });

  for (const competitor of competitors) {
    if (!competitor.googlePlaceId) {
      console.log(
        "[reputation-refresh] COMPETITOR metrics skipped - no googlePlaceId",
        {
          workspaceId,
          competitorId: competitor.id,
        }
      );
      continue;
    }

    console.log("[reputation-refresh] COMPETITOR metrics fetch", {
      workspaceId,
      competitorId: competitor.id,
      googlePlaceId: competitor.googlePlaceId,
    });

    try {
      googleMetricsFetchCount += 1;

      const latestCompetitorMetrics = await getGooglePlaceMetrics(
        competitor.googlePlaceId
      );

      const nextCompetitorRating =
        latestCompetitorMetrics.rating ?? competitor.rating ?? null;

      const nextCompetitorReviewCount =
        latestCompetitorMetrics.reviewCount ?? competitor.reviewCount ?? null;

      const competitorChanged = metricsActuallyChanged({
        currentRating: competitor.rating ?? null,
        currentReviewCount: competitor.reviewCount ?? null,
        nextRating: nextCompetitorRating,
        nextReviewCount: nextCompetitorReviewCount,
      });

      if (competitorChanged) {
        competitorMetricsChangedCount += 1;
      }

      if (
        metricChangeLooksMaterial({
          currentRating: competitor.rating ?? null,
          currentReviewCount: competitor.reviewCount ?? null,
          nextRating: nextCompetitorRating,
          nextReviewCount: nextCompetitorReviewCount,
        })
      ) {
        materialChangeLikely = true;
      }

      const updatedCompetitor = await prisma.competitor.update({
        where: { id: competitor.id },
        data: {
          rating: nextCompetitorRating,
          reviewCount: nextCompetitorReviewCount,
          lastEnrichedAt: new Date(),
        },
        select: {
          id: true,
          rating: true,
          reviewCount: true,
        },
      });

      if (competitorChanged) {
        await prisma.competitorMetricsSnapshot.create({
          data: {
            workspaceId,
            competitorId: updatedCompetitor.id,
            rating: updatedCompetitor.rating,
            reviewCount: updatedCompetitor.reviewCount,
          },
        });
      }

      console.log("[reputation-refresh] COMPETITOR metrics updated", {
        workspaceId,
        competitorId: competitor.id,
        googlePlaceId: competitor.googlePlaceId,
        rating: updatedCompetitor.rating,
        reviewCount: updatedCompetitor.reviewCount,
        changed: competitorChanged,
      });
    } catch (error) {
      console.error("Competitor reputation refresh failed", {
        workspaceId,
        competitorId: competitor.id,
        error,
      });
    }
  }

  await prisma.workspace.update({
  where: { id: workspaceId },
  data: {
    lastReputationRefreshAt: new Date(),
  },
});

const result = buildRefreshResult({
  status: "completed",
  workspaceId,
  startedAt,
  googleMetricsFetchCount,
  businessMetricsChanged,
  competitorMetricsChangedCount,
  competitorMetricsCheckedCount,
  materialChangeLikely,
});

console.log("[reputation-refresh] END", result);

return result;
}