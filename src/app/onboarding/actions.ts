"use server";

import { revalidatePath } from "next/cache";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import { onboardingSchema } from "@/lib/onboarding-schema";

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

export async function saveOnboarding(input: unknown) {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    throw new Error("Unauthorized");
  }

  const parsed = onboardingSchema.safeParse(input);

  if (!parsed.success) {
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
  const workspaceSlug = `${baseSlug}-${clerkUserId.slice(-6)}`;

  const workspace = await prisma.workspace.upsert({
    where: { slug: workspaceSlug },
    update: {
      name: businessName,
      industry: values.industry,
    },
    create: {
      name: businessName,
      slug: workspaceSlug,
      industry: values.industry,
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

  const preferredServices =
    cleanStringArray(values.preferredServices).length > 0
      ? cleanStringArray(values.preferredServices)
      : cleanStringArray(values.primaryServices);

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

  const busyMonths = cleanStringArray(
  Array.isArray(values.busyMonths)
    ? values.busyMonths
    : typeof values.busyMonths === "string"
      ? values.busyMonths.split(",")
      : []
);

const slowMonths = cleanStringArray(
  Array.isArray(values.slowMonths)
    ? values.slowMonths
    : typeof values.slowMonths === "string"
      ? values.slowMonths.split(",")
      : []
);

const busySeason: string | null =
  toNullableString(values.busySeason) ??
  (busyMonths.length > 0 ? busyMonths.join(", ") : null);

const slowSeason: string | null =
  toNullableString(values.slowSeason) ??
  (slowMonths.length > 0 ? slowMonths.join(", ") : null);

  const targetBookedJobsPerWeek =
    toNumberOrNull(values.targetBookedJobsPerWeek) ?? null;

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

    googleBusinessProfileUrl:
      toNullableString(values.googleBusinessProfileUrl),
    hasFaqContent: values.hasFaqContent || values.hasFaqPage || false,
    hasBlog: values.hasBlog || false,
    hasGoogleBusinessPage: values.hasGoogleBusinessPage || false,
    hasServicePages: values.hasServicePages || false,
    servicePageUrls: cleanStringArray(values.servicePageUrls),
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

  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
  revalidatePath("/competitors");
  revalidatePath("/campaigns");
  revalidatePath("/execution");

  return {
    success: true,
    workspaceId: workspace.id,
  };
}