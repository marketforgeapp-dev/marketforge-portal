import { prisma } from "@/lib/prisma";
import type {
  RevenueOpportunityHero,
} from "@/lib/revenue-opportunity-engine";
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

function isSnapshotOlderThanProfile(params: {
  generatedAt: Date;
  profileUpdatedAt: Date | null | undefined;
}) {
  if (!params.profileUpdatedAt) return false;
  return params.generatedAt.getTime() < params.profileUpdatedAt.getTime();
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

export async function invalidateWorkspaceOpportunitySnapshot(workspaceId: string) {
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
  const [existing, profileFreshness] = await Promise.all([
    prisma.workspaceOpportunitySnapshot.findUnique({
      where: { workspaceId },
    }),
    prisma.businessProfile.findUnique({
      where: { workspaceId },
      select: { updatedAt: true },
    }),
  ]);

  const snapshotIsFresh =
    !!existing &&
    isSnapshotUsable(existing) &&
    !isSnapshotOlderThanProfile({
      generatedAt: existing.generatedAt,
      profileUpdatedAt: profileFreshness?.updatedAt,
    });

  if (snapshotIsFresh && existing) {
    return {
      hero: parseHero(existing.heroJson),
      topOpportunity: parseTopOpportunity(existing.topOpportunityJson),
      backlogOpportunities: parseBacklog(existing.backlogJson),
      generatedAt: existing.generatedAt,
      fromCache: true,
    };
  }

  const profile = await prisma.businessProfile.findUnique({
    where: { workspaceId },
  });

  if (!profile) {
    throw new Error("Business profile not found for opportunity snapshot.");
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
}