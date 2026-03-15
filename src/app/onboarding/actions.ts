"use server";

import { revalidatePath } from "next/cache";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import { onboardingSchema } from "@/lib/onboarding-schema";
import { invalidateWorkspaceOpportunitySnapshot } from "@/lib/opportunity-snapshot";
import { calculateAeoReadinessScore } from "@/lib/aeo-readiness";

function toNullableString(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toRequiredString(
  value: string | null | undefined,
  fallback = ""
): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function toNumberOrNull(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function cleanStringArray(value: string[] | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => item.trim()).filter((item) => item.length > 0);
}

function uniqueMergedServices(...groups: string[][]): string[] {
  return Array.from(
    new Set(
      groups
        .flat()
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    )
  );
}

function sanitizeOnboardingInput(input: unknown) {
  if (!input || typeof input !== "object") {
    return input;
  }

  const raw = input as Record<string, unknown>;

  const rawCompetitors = Array.isArray(raw.competitors)
    ? raw.competitors
    : [];

  const sanitizedCompetitors = rawCompetitors
    .filter((competitor) => competitor && typeof competitor === "object")
    .map((competitor) => {
      const item = competitor as Record<string, unknown>;

      return {
        name: typeof item.name === "string" ? item.name.trim() : "",
        websiteUrl:
          typeof item.websiteUrl === "string" ? item.websiteUrl : "",
        googleBusinessUrl:
          typeof item.googleBusinessUrl === "string"
            ? item.googleBusinessUrl
            : "",
        logoUrl: typeof item.logoUrl === "string" ? item.logoUrl : "",
        isPrimaryCompetitor:
          typeof item.isPrimaryCompetitor === "boolean"
            ? item.isPrimaryCompetitor
            : false,
      };
    })
    .filter((competitor) => competitor.name.length > 0);

  return {
    ...raw,
    competitors: sanitizedCompetitors,
  };
}

export async function saveOnboarding(input: unknown) {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    throw new Error("Unauthorized");
  }

  const sanitizedInput = sanitizeOnboardingInput(input);
  const parsed = onboardingSchema.safeParse(sanitizedInput);

  if (!parsed.success) {
    console.error("Onboarding validation failed:", parsed.error.flatten());
    throw new Error("Invalid onboarding data");
  }

  const values = parsed.data;

  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress?.trim() || null;
  const firstName = clerkUser?.firstName ?? null;
  const lastName = clerkUser?.lastName ?? null;

  const appUser = await prisma.user.upsert({
    where: { clerkUserId },
    update: {
      email,
      firstName,
      lastName,
    },
    create: {
      clerkUserId,
      email,
      firstName,
      lastName,
    },
  });

  const businessName = values.businessName.trim();
  const baseSlug = slugify(businessName);
  const fallbackWorkspaceSlug = `${baseSlug}-${clerkUserId.slice(-6)}`;
  const now = new Date();

  const existingMembership = await prisma.workspaceMember.findFirst({
    where: {
      userId: appUser.id,
    },
    include: {
      workspace: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const workspace = existingMembership
    ? await prisma.workspace.update({
        where: { id: existingMembership.workspaceId },
        data: {
          name: businessName,
          industry: values.industry,
          isDemo: false,
          onboardingCompletedAt: now,
        },
      })
    : await prisma.workspace.create({
        data: {
          name: businessName,
          slug: fallbackWorkspaceSlug,
          industry: values.industry,
          isDemo: false,
          onboardingCompletedAt: now,
        },
      });

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: appUser.id,
      },
    },
    update: {
      role: "OWNER",
    },
    create: {
      workspaceId: workspace.id,
      userId: appUser.id,
      role: "OWNER",
    },
  });

    const preferredServices = uniqueMergedServices(
    cleanStringArray(values.preferredServices),
    cleanStringArray(values.primaryServices)
  );

  const deprioritizedServices =
    cleanStringArray(values.deprioritizedServices).length > 0
      ? cleanStringArray(values.deprioritizedServices)
      : values.lowestPriorityService
        ? [values.lowestPriorityService]
        : [];

  const cityValue = toNullableString(values.city);
  const stateValue = toNullableString(values.state);

  const cityState =
    cityValue && stateValue
      ? `${cityValue}, ${stateValue}`
      : cityValue ?? stateValue ?? null;

  const serviceArea =
    toNullableString(values.serviceArea) ??
    cityState ??
    "Not specified";

  const busyMonths = cleanStringArray(values.busyMonths);
  const slowMonths = cleanStringArray(values.slowMonths);

  const busySeason: string | null =
    toNullableString(values.busySeason) ??
    (busyMonths.length > 0 ? busyMonths.join(", ") : null);

  const slowSeason: string | null =
    toNullableString(values.slowSeason) ??
    (slowMonths.length > 0 ? slowMonths.join(", ") : null);

  const targetBookedJobsPerWeek =
    toNumberOrNull(values.targetBookedJobsPerWeek) ?? null;
    const hasFaqContent = values.hasFaqContent || values.hasFaqPage || false;
  const hasGoogleBusinessPage = values.hasGoogleBusinessPage || false;
  const hasServicePages = values.hasServicePages || false;
  const servicePageUrls = cleanStringArray(values.servicePageUrls);
  const googleBusinessProfileUrl =
    toNullableString(values.googleBusinessProfileUrl);

  const aeoReadinessScore = calculateAeoReadinessScore({
    hasServicePages,
    hasFaqContent,
    hasBlog: values.hasBlog || false,
    hasGoogleBusinessPage,
    servicePageUrls,
    googleBusinessProfileUrl,
  });
  const businessProfileData = {
    businessName,
    website: toNullableString(values.website),
    logoUrl: toNullableString(values.logoUrl),
    phone: toNullableString(values.phone),

    city: toRequiredString(values.city, "Not specified"),
    state: toRequiredString(values.state, "Not specified"),
    serviceArea,
    serviceAreaRadiusMiles: toNumberOrNull(values.serviceAreaRadiusMiles),

    brandTone: values.brandTone ?? null,
    industryLabel:
      toNullableString(values.industryLabel) ?? values.industry,

    averageJobValue: toNumberOrNull(values.averageJobValue),
    targetWeeklyRevenue: toNumberOrNull(values.targetWeeklyRevenue),
    technicians: toNumberOrNull(values.technicians),
    jobsPerTechnicianPerDay: toNumberOrNull(values.jobsPerTechnicianPerDay),
    weeklyCapacity: toNumberOrNull(values.weeklyCapacity),
    targetBookedJobsPerWeek,

    preferredServices,
    deprioritizedServices,

    highestMarginService: toNullableString(values.highestMarginService),
    lowestPriorityService: toNullableString(values.lowestPriorityService),

    busySeason,
    slowSeason,
    busyMonths,
    slowMonths,
    seasonalityNotes: toNullableString(values.seasonalityNotes),

    googleBusinessProfileUrl,
    hasFaqContent,
    hasBlog: values.hasBlog || false,
    hasGoogleBusinessPage,
    hasServicePages,
    servicePageUrls,
    aeoReadinessScore,
  };

  await prisma.businessProfile.upsert({
    where: { workspaceId: workspace.id },
    update: businessProfileData,
    create: {
      workspaceId: workspace.id,
      ...businessProfileData,
    },
  });

  await prisma.competitor.deleteMany({
    where: { workspaceId: workspace.id },
  });

  const competitors = values.competitors
    .filter((competitor) => competitor.name.trim().length > 0)
    .map((competitor, index) => ({
      workspaceId: workspace.id,
      name: competitor.name.trim(),
      websiteUrl: toNullableString(competitor.websiteUrl),
      googleBusinessUrl: toNullableString(competitor.googleBusinessUrl),
      logoUrl: toNullableString(competitor.logoUrl),
      isPrimaryCompetitor:
        competitor.isPrimaryCompetitor ?? index === 0,
      notes: null,
      serviceFocus: [],
      rating: null,
      reviewCount: null,
      isRunningAds: null,
      isPostingActively: null,
      hasActivePromo: null,
      reviewVelocity: null,
      signalSummary: null,
    }));

  if (competitors.length > 0) {
  await prisma.competitor.createMany({
    data: competitors,
  });
}

await invalidateWorkspaceOpportunitySnapshot(workspace.id);

revalidatePath("/onboarding");
revalidatePath("/dashboard");
revalidatePath("/competitors");
revalidatePath("/campaigns");
revalidatePath("/execution");
revalidatePath("/settings");
revalidatePath("/reports");

  return {
    success: true,
    workspaceId: workspace.id,
  };
}