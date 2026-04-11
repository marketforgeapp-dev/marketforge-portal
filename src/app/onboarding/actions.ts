"use server";

import { revalidatePath } from "next/cache";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import { onboardingSchema } from "@/lib/onboarding-schema";
import { calculateAeoReadinessScore } from "@/lib/aeo-readiness";
import { discoverLocalCompetitors } from "@/lib/google-places-competitors";
import { stripe } from "@/lib/stripe";
import { BILLING_PRICE_IDS, isDemoEmail } from "@/lib/billing";

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
  placeId:
    typeof item.placeId === "string" ? item.placeId : "",
  rating:
    typeof item.rating === "number" ? item.rating : null,
  reviewCount:
    typeof item.reviewCount === "number" ? item.reviewCount : null,
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
              status: "PENDING_ACTIVATION",
              onboardingCompletedAt: now,
},
      })
    : await prisma.workspace.create({
        data: {
              name: businessName,
              slug: fallbackWorkspaceSlug,
              industry: values.industry,
              isDemo: false,
              status: "PENDING_ACTIVATION",
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
    const discoveredCompetitorPool = values.competitors.length
    ? await discoverLocalCompetitors({
        companyName: values.businessName,
        industry: values.industry,
        city: values.city,
        state: values.state,
        website: values.website,
      }).catch((error) => {
        console.error("Competitor discovery failed during onboarding save", {
          workspaceId: workspace.id,
          businessName: values.businessName,
          error,
        });
        return [];
      })
    : [];
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
    monthlyActionBudget: toNumberOrNull(values.monthlyActionBudget),
    technicians: toNumberOrNull(values.technicians),
    jobsPerTechnicianPerDay: toNumberOrNull(values.jobsPerTechnicianPerDay),
    weeklyCapacity: toNumberOrNull(values.weeklyCapacity),
    
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
        googlePlaceId: toNullableString(values.googlePlaceId),
    googleRating: toNumberOrNull(values.googleRating),
    googleReviewCount: toNumberOrNull(values.googleReviewCount),
    lastReputationEnrichedAt:
      toNumberOrNull(values.googleRating) !== null ||
      toNumberOrNull(values.googleReviewCount) !== null
        ? new Date()
        : null,
    hasFaqContent,
    hasBlog: values.hasBlog || false,
    hasGoogleBusinessPage,
    hasServicePages,
    servicePageUrls,
    aeoReadinessScore,
  };

    const businessProfile = await prisma.businessProfile.upsert({
    where: { workspaceId: workspace.id },
    update: businessProfileData,
    create: {
      workspaceId: workspace.id,
      ...businessProfileData,
    },
  });

    await prisma.businessReputationSnapshot.create({
    data: {
      workspaceId: workspace.id,
      businessProfileId: businessProfile.id,
      rating: businessProfile.googleRating,
      reviewCount: businessProfile.googleReviewCount,
    },
  });

  await prisma.competitor.deleteMany({
    where: { workspaceId: workspace.id },
  });

  const enrichedCompetitors = await Promise.all(
  values.competitors
    .filter((competitor) => competitor.name.trim().length > 0)
    .map(async (competitor, index) => {
            const enriched =
        discoveredCompetitorPool.find(
          (c) =>
            c.name.trim().toLowerCase() ===
            competitor.name.trim().toLowerCase()
        ) ?? null;

      return {
        workspaceId: workspace.id,
        name: competitor.name.trim(),

        websiteUrl:
          toNullableString(competitor.websiteUrl) ??
          enriched?.websiteUrl ??
          null,

        googleBusinessUrl:
          toNullableString(competitor.googleBusinessUrl) ??
          enriched?.googleBusinessUrl ??
          null,

        logoUrl:
          toNullableString(competitor.logoUrl) ??
          enriched?.logoUrl ??
          null,

        isPrimaryCompetitor:
          competitor.isPrimaryCompetitor ?? index === 0,

        notes: null,
        serviceFocus: enriched?.serviceFocus ?? [],
          googlePlaceId:
    toNullableString(competitor.placeId) ??
    enriched?.placeId ??
    null,

  rating:
    typeof competitor.rating === "number"
      ? competitor.rating
      : enriched?.rating ?? null,

  reviewCount:
    typeof competitor.reviewCount === "number"
      ? competitor.reviewCount
      : enriched?.reviewCount ?? null,

  lastEnrichedAt:
    typeof competitor.rating === "number" ||
    typeof competitor.reviewCount === "number" ||
    typeof enriched?.rating === "number" ||
    typeof enriched?.reviewCount === "number"
      ? new Date()
      : null,
        isRunningAds: null,
        isPostingActively: null,
        hasActivePromo: null,
        reviewVelocity: null,
        signalSummary: null,
      };
    })
);

  if (enrichedCompetitors.length > 0) {
  await prisma.competitor.createMany({
    data: enrichedCompetitors,
  });

  const createdCompetitors = await prisma.competitor.findMany({
    where: { workspaceId: workspace.id },
    select: {
      id: true,
      rating: true,
      reviewCount: true,
    },
  });

  if (createdCompetitors.length > 0) {
    await prisma.competitorMetricsSnapshot.createMany({
      data: createdCompetitors.map((competitor) => ({
        workspaceId: workspace.id,
        competitorId: competitor.id,
        rating: competitor.rating,
        reviewCount: competitor.reviewCount,
      })),
    });
  }
}

await prisma.workspace.update({
  where: { id: workspace.id },
  data: {
    lastReputationRefreshAt: new Date(),
  },
});

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

export async function activateWorkspace(input: {
  plan: "STANDARD_MONTHLY" | "STANDARD_YEARLY";
  paymentMethodId: string;
}) {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    throw new Error("Unauthorized");
  }

  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress?.trim() || null;
  const firstName = clerkUser?.firstName?.trim() || "";
  const lastName = clerkUser?.lastName?.trim() || "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  const appUser = await prisma.user.findUnique({
    where: { clerkUserId },
  });

  if (!appUser) {
    throw new Error("User not found");
  }

  const membership = await prisma.workspaceMember.findFirst({
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

  if (!membership?.workspace) {
    throw new Error("Workspace not found");
  }

  const workspace = membership.workspace;

  if (workspace.status === "ACTIVE") {
    return {
      success: true,
      bypassed: false,
    };
  }
console.log("Demo check:", {
  email,
  isDemo: isDemoEmail(email),
});
  if (isDemoEmail(email)) {
    await prisma.workspace.update({
      where: { id: workspace.id },
      data: {
        isDemo: true,
        status: "ACTIVE",
        activatedAt: new Date(),
      },
    });

    revalidatePath("/onboarding");
    revalidatePath("/settings");
    revalidatePath("/dashboard");

    return {
      success: true,
      bypassed: true,
    };
  }

  const priceId =
    input.plan === "STANDARD_YEARLY"
      ? BILLING_PRICE_IDS.STANDARD_YEARLY
      : BILLING_PRICE_IDS.STANDARD_MONTHLY;

  if (!priceId) {
    throw new Error("Missing Stripe price configuration");
  }

  if (!email) {
    throw new Error("User email is required for billing");
  }

  let customerId = workspace.stripeCustomerId ?? null;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email,
      name: fullName || undefined,
      metadata: {
        workspaceId: workspace.id,
      },
    });

    customerId = customer.id;
  }

  await stripe.paymentMethods.attach(input.paymentMethodId, {
    customer: customerId,
  }).catch((error) => {
    const message =
      error instanceof Error ? error.message.toLowerCase() : "";

    if (!message.includes("already")) {
      throw error;
    }
  });

  await stripe.customers.update(customerId, {
    email,
    name: fullName || undefined,
    invoice_settings: {
      default_payment_method: input.paymentMethodId,
    },
  });

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    default_payment_method: input.paymentMethodId,
    payment_behavior: "error_if_incomplete",
    payment_settings: {
      save_default_payment_method: "on_subscription",
    },
    metadata: {
      workspaceId: workspace.id,
    },
  });

  if (
    subscription.status !== "active" &&
    subscription.status !== "trialing"
  ) {
    throw new Error(
      `Subscription activation failed with status: ${subscription.status}`
    );
  }

    const currentPeriodEndTimestamp =
    subscription.items.data[0]?.current_period_end;

  const currentPeriodEnd =
    typeof currentPeriodEndTimestamp === "number"
      ? new Date(currentPeriodEndTimestamp * 1000)
      : null;

  await prisma.workspace.update({
    where: { id: workspace.id },
    data: {
      isDemo: false,
      status: "ACTIVE",
      activatedAt: new Date(),
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd,
    },
  });

  revalidatePath("/onboarding");
  revalidatePath("/settings");
  revalidatePath("/dashboard");

  return {
    success: true,
    bypassed: false,
  };
}