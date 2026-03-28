import { prisma } from "@/lib/prisma";
import { getGooglePlaceMetrics } from "@/lib/google-place-metrics";

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

export async function ensureWorkspaceReputationFreshForWeek(
  workspaceId: string
) {
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
    return;
  }

  const startOfWeek = getStartOfCurrentWeek();

  if (
    workspace.lastReputationRefreshAt &&
    workspace.lastReputationRefreshAt >= startOfWeek
  ) {
    console.log("[reputation-refresh] SKIP weekly gate", {
      workspaceId,
      lastReputationRefreshAt: workspace.lastReputationRefreshAt,
    });
    return;
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

  console.log("[reputation-refresh] END", { workspaceId });
}