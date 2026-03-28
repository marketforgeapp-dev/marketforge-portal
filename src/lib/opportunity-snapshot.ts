import { prisma } from "@/lib/prisma";
import { ensureWorkspaceReputationFreshForWeek } from "@/lib/reputation-refresh";
import type { RevenueOpportunityHero } from "@/lib/revenue-opportunity-engine";
import type { SelectedOpportunity } from "@/lib/select-revenue-opportunities";
import { buildRevenueOpportunityEngine } from "@/lib/revenue-opportunity-engine";
import { selectRevenueOpportunities } from "@/lib/select-revenue-opportunities";
import { getCampaignPerformanceSignals } from "@/lib/campaign-performance-signals";

const SNAPSHOT_TTL_HOURS = 4;

export type WorkspaceOpportunitySnapshotPayload = {
  hero: RevenueOpportunityHero;
  topOpportunity: SelectedOpportunity;
  backlogOpportunities: SelectedOpportunity[];
  generatedAt: Date;
  fromCache: boolean;
};

const inFlightSnapshotBuilds = new Map<
  string,
  Promise<WorkspaceOpportunitySnapshotPayload>
>();

function getExpiryDate() {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + SNAPSHOT_TTL_HOURS);
  return expiresAt;
}

function isSnapshotUsable(snapshot: {
  invalidatedAt: Date | null;
  expiresAt: Date;
}) {
  if (snapshot.invalidatedAt) return false;
  return snapshot.expiresAt.getTime() > Date.now();
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
    console.log("[snapshot] USING CACHE", {
      workspaceId,
      generatedAt: existing.generatedAt,
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
      try {
        try {
          console.log("[snapshot] BEFORE reputation refresh", { workspaceId });
          await ensureWorkspaceReputationFreshForWeek(workspaceId);
          console.log("[snapshot] AFTER reputation refresh", { workspaceId });
        } catch (error) {
          console.error("Weekly workspace reputation refresh failed", {
            workspaceId,
            error,
          });
        }

        const profile = await prisma.businessProfile.findUnique({
          where: { workspaceId },
        });

        if (!profile) {
          throw new Error(
            "Business profile not found for opportunity snapshot."
          );
        }

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

        const engine = await buildRevenueOpportunityEngine({
          profile,
          competitors,
          performanceSignals,
        });

        const selection = selectRevenueOpportunities({
          opportunities: engine.rankedOpportunities,
          campaigns,
          availableJobsEstimate: engine.availableJobsEstimate,
          competitors,
        });

        const generatedAt = new Date();

        const payload: WorkspaceOpportunitySnapshotPayload = {
          hero: selection.hero,
          topOpportunity: selection.topOpportunity,
          backlogOpportunities: selection.backlogOpportunities,
          generatedAt,
          fromCache: false,
        };

        console.log("[snapshot] REGENERATING", {
          workspaceId,
        });

        await prisma.workspaceOpportunitySnapshot.upsert({
          where: { workspaceId },
          update: {
            snapshotVersion: { increment: 1 },
            heroJson: payload.hero,
            topOpportunityJson: payload.topOpportunity,
            backlogJson: payload.backlogOpportunities,
            generatedAt: payload.generatedAt,
            expiresAt: getExpiryDate(),
            invalidatedAt: null,
          },
          create: {
            workspaceId,
            heroJson: payload.hero,
            topOpportunityJson: payload.topOpportunity,
            backlogJson: payload.backlogOpportunities,
            generatedAt: payload.generatedAt,
            expiresAt: getExpiryDate(),
            invalidatedAt: null,
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