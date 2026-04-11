"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { invalidateWorkspaceOpportunitySnapshot } from "@/lib/opportunity-snapshot";
import { calculateAeoReadinessScore } from "@/lib/aeo-readiness";
import { stripe } from "@/lib/stripe";
import { redirect } from "next/navigation";
import {
  lookupBusinessCandidates,
  lookupSingleCompetitor,
} from "@/lib/google-places-competitors";

type RawCompetitor = {
  name?: unknown;
  websiteUrl?: unknown;
  googleBusinessUrl?: unknown;
  logoUrl?: unknown;
  isPrimaryCompetitor?: unknown;
};

type RawSelectedGoogleBusiness = {
  placeId?: unknown;
  name?: unknown;
  formattedAddress?: unknown;
  googleBusinessUrl?: unknown;
  rating?: unknown;
  reviewCount?: unknown;
};

type RawSettingsInput = {
  businessName?: unknown;
  website?: unknown;
  logoUrl?: unknown;
  phone?: unknown;

  city?: unknown;
  state?: unknown;
  serviceArea?: unknown;
  serviceAreaRadiusMiles?: unknown;
  industry?: unknown;
  industryLabel?: unknown;
  brandTone?: unknown;

  preferredServices?: unknown;
  primaryServices?: unknown;
  deprioritizedServices?: unknown;
  servicePricing?: unknown;

  averageJobValue?: unknown;
  highestMarginService?: unknown;
  lowestPriorityService?: unknown;

    technicians?: unknown;
  jobsPerTechnicianPerDay?: unknown;
  weeklyCapacity?: unknown;
  targetWeeklyRevenue?: unknown;
  monthlyActionBudget?: unknown;
  
  competitors?: unknown;

  hasServicePages?: unknown;
  hasFaqContent?: unknown;
  hasFaqPage?: unknown;
  hasBlog?: unknown;
  hasGoogleBusinessPage?: unknown;
  googleBusinessProfileUrl?: unknown;
  googlePlaceId?: unknown;
  googleRating?: unknown;
  googleReviewCount?: unknown;
  selectedGoogleBusiness?: unknown;
  servicePageUrls?: unknown;

  busySeason?: unknown;
  slowSeason?: unknown;
  busyMonths?: unknown;
  slowMonths?: unknown;
  seasonalityNotes?: unknown;
};

const VALID_INDUSTRIES = ["PLUMBING", "HVAC", "SEPTIC", "TREE_SERVICE"] as const;
const VALID_BRAND_TONES = ["PROFESSIONAL", "FRIENDLY", "URGENT", "LOCAL"] as const;

type ValidIndustry = (typeof VALID_INDUSTRIES)[number];
type ValidBrandTone = (typeof VALID_BRAND_TONES)[number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toStringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toTrimmedString(value: unknown): string {
  return toStringValue(value).trim();
}

function normalizeSelectedGoogleBusiness(
  value: unknown
): {
  placeId: string | null;
  name: string | null;
  formattedAddress: string | null;
  googleBusinessUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
} | null {
  if (!isRecord(value)) return null;

  const placeId = toNullableString(value.placeId);
  const name = toNullableString(value.name);
  const formattedAddress = toNullableString(value.formattedAddress);
  const googleBusinessUrl = toNullableString(value.googleBusinessUrl);
  const rating = toNumberOrNull(value.rating);
  const reviewCount = toNumberOrNull(value.reviewCount);

  if (!placeId && !googleBusinessUrl) {
    return null;
  }

  return {
    placeId,
    name,
    formattedAddress,
    googleBusinessUrl,
    rating,
    reviewCount,
  };
}

function toNullableString(value: unknown): string | null {
  const trimmed = toTrimmedString(value);
  return trimmed.length > 0 ? trimmed : null;
}

function toRequiredString(value: unknown, fallback = ""): string {
  const trimmed = toTrimmedString(value);
  return trimmed.length > 0 ? trimmed : fallback;
}

function toNumberOrNull(value: unknown): number | null {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toBoolean(value: unknown): boolean {
  return value === true;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => item.length > 0);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  return [];
}

function toIndustry(value: unknown): ValidIndustry {
  return VALID_INDUSTRIES.includes(value as ValidIndustry)
    ? (value as ValidIndustry)
    : "PLUMBING";
}

function toBrandTone(value: unknown): ValidBrandTone | null {
  return VALID_BRAND_TONES.includes(value as ValidBrandTone)
    ? (value as ValidBrandTone)
    : null;
}

function normalizeCompetitors(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const competitors = value
    .filter((item): item is RawCompetitor => isRecord(item))
    .map((item) => ({
      name: toTrimmedString(item.name),
      websiteUrl: toStringValue(item.websiteUrl),
      googleBusinessUrl: toStringValue(item.googleBusinessUrl),
      logoUrl: toStringValue(item.logoUrl),
      isPrimaryCompetitor: toBoolean(item.isPrimaryCompetitor),
    }))
    .filter((item) => item.name.length > 0);

  if (competitors.length === 0) {
    return [];
  }

  const selectedPrimaryIndex = competitors.findIndex(
    (competitor) => competitor.isPrimaryCompetitor
  );
  const primaryIndex = selectedPrimaryIndex >= 0 ? selectedPrimaryIndex : 0;

  return competitors.map((competitor, index) => ({
    ...competitor,
    isPrimaryCompetitor: index === primaryIndex,
  }));
}

function normalizeServicePricing(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map((item) => {
      const serviceName = toTrimmedString(item.serviceName);
      const averageRevenue = toNumberOrNull(item.averageRevenue);

      return {
        serviceName,
        averageRevenue,
      };
    })
    .filter((item) => item.serviceName.length > 0);
}

function normalizeSettingsInput(input: unknown) {
  const raw: RawSettingsInput = isRecord(input) ? input : {};

  const industry = toIndustry(raw.industry);
  const businessName = toTrimmedString(raw.businessName);

  if (!businessName) {
    throw new Error("Business name is required");
  }

  return {
    businessName,
    website: toNullableString(raw.website),
    logoUrl: toNullableString(raw.logoUrl),
    phone: toNullableString(raw.phone),

    city: toRequiredString(raw.city, "Not specified"),
    state: toRequiredString(raw.state, "Not specified"),
    serviceArea: toNullableString(raw.serviceArea),
    serviceAreaRadiusMiles: toNumberOrNull(raw.serviceAreaRadiusMiles),

    industry,
    industryLabel: toNullableString(raw.industryLabel) ?? industry,
    brandTone: toBrandTone(raw.brandTone),

    preferredServices: toStringArray(raw.preferredServices),
    primaryServices: toStringArray(raw.primaryServices),
    deprioritizedServices: toStringArray(raw.deprioritizedServices),
    servicePricing: normalizeServicePricing(raw.servicePricing),

    averageJobValue: toNumberOrNull(raw.averageJobValue),
    highestMarginService: toNullableString(raw.highestMarginService),
    lowestPriorityService: toNullableString(raw.lowestPriorityService),

        technicians: toNumberOrNull(raw.technicians),
    jobsPerTechnicianPerDay: toNumberOrNull(raw.jobsPerTechnicianPerDay),
    weeklyCapacity: toNumberOrNull(raw.weeklyCapacity),
    targetWeeklyRevenue: toNumberOrNull(raw.targetWeeklyRevenue),
    monthlyActionBudget: toNumberOrNull(raw.monthlyActionBudget),
    
    competitors: normalizeCompetitors(raw.competitors),

        hasServicePages: toBoolean(raw.hasServicePages),
    hasFaqContent: toBoolean(raw.hasFaqContent),
    hasFaqPage: toBoolean(raw.hasFaqPage),
    hasBlog: toBoolean(raw.hasBlog),
    hasGoogleBusinessPage: toBoolean(raw.hasGoogleBusinessPage),
    googleBusinessProfileUrl: toNullableString(raw.googleBusinessProfileUrl),
    googlePlaceId: toNullableString(raw.googlePlaceId),
    googleRating: toNumberOrNull(raw.googleRating),
    googleReviewCount: toNumberOrNull(raw.googleReviewCount),
    servicePageUrls: toStringArray(raw.servicePageUrls),

    busySeason: toNullableString(raw.busySeason),
    slowSeason: toNullableString(raw.slowSeason),
    busyMonths: toStringArray(raw.busyMonths),
    slowMonths: toStringArray(raw.slowMonths),
    seasonalityNotes: toNullableString(raw.seasonalityNotes),
  };
}

export async function saveSettings(input: unknown) {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    throw new Error("Unauthorized");
  }

  const values = normalizeSettingsInput(input);

  const user = await prisma.user.findUnique({
    where: { clerkUserId },
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

  if (!user || user.workspaces.length === 0) {
    throw new Error("Workspace not found");
  }

  const workspace = user.workspaces[0].workspace;

  const preferredServices =
    values.preferredServices.length > 0
      ? values.preferredServices
      : values.primaryServices;

  const deprioritizedServices =
    values.deprioritizedServices.length > 0
      ? values.deprioritizedServices
      : values.lowestPriorityService
        ? [values.lowestPriorityService]
        : [];

  const cityState =
    values.city && values.state
      ? `${values.city}, ${values.state}`
      : values.city || values.state || null;

  const serviceArea = values.serviceArea ?? cityState ?? "Not specified";

  const busySeason =
    values.busySeason ??
    (values.busyMonths.length > 0 ? values.busyMonths.join(", ") : null);

  const slowSeason =
    values.slowSeason ??
    (values.slowMonths.length > 0 ? values.slowMonths.join(", ") : null);

  await prisma.workspace.update({
    where: { id: workspace.id },
    data: {
      name: values.businessName,
      industry: values.industry,
    },
  });

const rawInput = isRecord(input) ? input : {};

const selectedGoogleBusiness = normalizeSelectedGoogleBusiness(
  rawInput.selectedGoogleBusiness
);

  let resolvedBusinessGoogleMatch:
    | {
        placeId: string | null;
        googleBusinessUrl: string | null;
        rating: number | null;
        reviewCount: number | null;
      }
    | null = null;

  if (selectedGoogleBusiness) {
    resolvedBusinessGoogleMatch = {
      placeId: selectedGoogleBusiness.placeId,
      googleBusinessUrl:
        selectedGoogleBusiness.googleBusinessUrl ??
        toNullableString(values.googleBusinessProfileUrl),
      rating: selectedGoogleBusiness.rating,
      reviewCount: selectedGoogleBusiness.reviewCount,
    };
  } else if (
    values.googlePlaceId ||
    values.googleRating !== null ||
    values.googleReviewCount !== null
  ) {
    resolvedBusinessGoogleMatch = {
      placeId: toNullableString(values.googlePlaceId),
      googleBusinessUrl: toNullableString(values.googleBusinessProfileUrl),
      rating: toNumberOrNull(values.googleRating),
      reviewCount: toNumberOrNull(values.googleReviewCount),
    };
  } else {
    const fallbackCandidates = await lookupBusinessCandidates({
  companyName: values.businessName,
  industry: values.industry,
  city: values.city,
  state: values.state,
  website: values.website,
  phone: values.phone,
}).catch(() => []);

    const fallback = fallbackCandidates[0] ?? null;

    if (fallback) {
      resolvedBusinessGoogleMatch = {
        placeId: fallback.placeId,
        googleBusinessUrl:
          fallback.googleBusinessUrl ??
          toNullableString(values.googleBusinessProfileUrl),
        rating: fallback.rating,
        reviewCount: fallback.reviewCount,
      };
    }
  }

  const aeoReadinessScore = calculateAeoReadinessScore({
    hasServicePages: values.hasServicePages,
    hasFaqContent: values.hasFaqContent,
    hasBlog: values.hasBlog,
    hasGoogleBusinessPage: values.hasGoogleBusinessPage,
    servicePageUrls: values.servicePageUrls,
    googleBusinessProfileUrl: values.googleBusinessProfileUrl,
  });

  const businessProfileData = {
    businessName: values.businessName,
    website: values.website,
    logoUrl: values.logoUrl,
    phone: values.phone,

    city: values.city,
    state: values.state,
    serviceArea,
    serviceAreaRadiusMiles: values.serviceAreaRadiusMiles,

    brandTone: values.brandTone,
    industryLabel: values.industryLabel,

        averageJobValue: values.averageJobValue,
    targetWeeklyRevenue: values.targetWeeklyRevenue,
    monthlyActionBudget: values.monthlyActionBudget,
    technicians: values.technicians,
    jobsPerTechnicianPerDay: values.jobsPerTechnicianPerDay,
    weeklyCapacity: values.weeklyCapacity,
    
    preferredServices,
    deprioritizedServices,

    highestMarginService: values.highestMarginService,
    lowestPriorityService: values.lowestPriorityService,
    servicePricingJson: values.servicePricing,

    busySeason,
    slowSeason,
    busyMonths: values.busyMonths,
    slowMonths: values.slowMonths,
    seasonalityNotes: values.seasonalityNotes,

        googleBusinessProfileUrl:
      resolvedBusinessGoogleMatch?.googleBusinessUrl ??
      values.googleBusinessProfileUrl ??
      null,
    googlePlaceId: resolvedBusinessGoogleMatch?.placeId ?? null,
    googleRating: resolvedBusinessGoogleMatch?.rating ?? null,
    googleReviewCount: resolvedBusinessGoogleMatch?.reviewCount ?? null,
    lastReputationEnrichedAt:
      resolvedBusinessGoogleMatch?.rating !== null ||
      resolvedBusinessGoogleMatch?.reviewCount !== null
        ? new Date()
        : null,

hasFaqContent: values.hasFaqContent,
hasBlog: values.hasBlog,
hasGoogleBusinessPage: values.hasGoogleBusinessPage,
hasServicePages: values.hasServicePages,
servicePageUrls: values.servicePageUrls,
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

  const enrichedCompetitors = await Promise.all(
    values.competitors.map(async (competitor) => {
      const trimmedName = competitor.name.trim();
      const manualWebsiteUrl = toNullableString(competitor.websiteUrl);
      const manualGoogleBusinessUrl = toNullableString(
        competitor.googleBusinessUrl
      );
      const manualLogoUrl = toNullableString(competitor.logoUrl);

      const discoveredMatch =
        trimmedName.length > 0
          ? await lookupSingleCompetitor({
              companyName: trimmedName,
              industry: values.industry,
              city: values.city,
              state: values.state,
              website: manualWebsiteUrl,
            })
          : null;

      return {
        workspaceId: workspace.id,
        name: trimmedName,
        websiteUrl: manualWebsiteUrl ?? discoveredMatch?.websiteUrl ?? null,
        googleBusinessUrl:
          manualGoogleBusinessUrl ?? discoveredMatch?.googleBusinessUrl ?? null,
        logoUrl: manualLogoUrl ?? discoveredMatch?.logoUrl ?? null,
        isPrimaryCompetitor: competitor.isPrimaryCompetitor,
        notes: discoveredMatch?.whyItMatters ?? null,
        serviceFocus: discoveredMatch?.serviceFocus ?? [],
        googlePlaceId: discoveredMatch?.placeId ?? null,

rating:
  typeof discoveredMatch?.rating === "number"
    ? discoveredMatch.rating
    : null,

reviewCount:
  typeof discoveredMatch?.reviewCount === "number"
    ? discoveredMatch.reviewCount
    : null,

lastEnrichedAt:
  typeof discoveredMatch?.rating === "number" ||
  typeof discoveredMatch?.reviewCount === "number"
    ? new Date()
    : null,
        isRunningAds: null,
        isPostingActively: null,
        hasActivePromo: null,
        reviewVelocity: null,
        signalSummary: discoveredMatch?.whyItMatters ?? null,
      };
    })
  );

  if (enrichedCompetitors.length > 0) {
    await prisma.competitor.createMany({
      data: enrichedCompetitors,
    });
  }

  await invalidateWorkspaceOpportunitySnapshot(workspace.id);

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/competitors");
  revalidatePath("/campaigns");
  revalidatePath("/reports");

  return { success: true };
}

export async function fetchBusinessCandidates(input: {
  companyName: string;
  industry: "PLUMBING" | "HVAC" | "SEPTIC" | "TREE_SERVICE";
  city?: string | null;
  state?: string | null;
  website?: string | null;
  phone?: string | null;
}) {
  try {
    const candidates = await lookupBusinessCandidates(input);
    return { success: true, candidates };
  } catch (error) {
    console.error("Failed to fetch business candidates", error);
    return { success: false, candidates: [] };
  }
}

async function getCurrentWorkspaceForSettingsActions() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId },
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

  if (!user || user.workspaces.length === 0) {
    throw new Error("Workspace not found");
  }

  return user.workspaces[0].workspace;
}

export async function cancelSubscriptionAtPeriodEnd() {
  const workspace = await getCurrentWorkspaceForSettingsActions();

  if (!workspace.stripeSubscriptionId) {
    throw new Error("No active subscription found");
  }

  const subscription = await stripe.subscriptions.update(
    workspace.stripeSubscriptionId,
    {
      cancel_at_period_end: true,
    }
  );

  await prisma.workspace.update({
    where: { id: workspace.id },
    data: {
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");

  return { success: true };
}

export async function resumeSubscription() {
  const workspace = await getCurrentWorkspaceForSettingsActions();

  if (!workspace.stripeSubscriptionId) {
    throw new Error("No subscription found");
  }

  const subscription = await stripe.subscriptions.update(
    workspace.stripeSubscriptionId,
    {
      cancel_at_period_end: false,
    }
  );

  await prisma.workspace.update({
    where: { id: workspace.id },
    data: {
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");

  return { success: true };
}

function getBillingReturnUrl() {
  const appUrl = process.env.APP_URL;

  if (!appUrl) {
    throw new Error("Missing APP_URL");
  }

  return `${appUrl}/settings`;
}

export async function createPaymentMethodUpdatePortalSession() {
  const workspace = await getCurrentWorkspaceForSettingsActions();

  if (!workspace.stripeCustomerId) {
    throw new Error("No Stripe customer found for this workspace.");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: workspace.stripeCustomerId,
    return_url: getBillingReturnUrl(),
    flow_data: {
      type: "payment_method_update",
    },
  });

  return {
    success: true,
    url: session.url,
  };
}

export async function createSubscriptionManagementPortalSession() {
  const workspace = await getCurrentWorkspaceForSettingsActions();

  if (!workspace.stripeCustomerId) {
    throw new Error("No Stripe customer found for this workspace.");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: workspace.stripeCustomerId,
    return_url: getBillingReturnUrl(),
  });

  return {
    success: true,
    url: session.url,
  };
}