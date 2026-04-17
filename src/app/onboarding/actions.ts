"use server";

import { revalidatePath } from "next/cache";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import { onboardingSchema } from "@/lib/onboarding-schema";
import { calculateAeoReadinessScore } from "@/lib/aeo-readiness";
import { discoverLocalCompetitors } from "@/lib/google-places-competitors";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { BILLING_PRICE_IDS, isDemoEmail } from "@/lib/billing";
import { mergeAndDedupeServicesForIndustry } from "@/lib/service-normalization";
import { sendWorkspaceCreatedNotification } from "@/lib/email/send-workspace-created-notification";

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

type ResolvedActivationOffer =
  | {
      type: "NONE";
    }
  | {
      type: "FOUNDER_1";
      title: string;
      description: string;
    }
  | {
      type: "FOUNDER_2";
      title: string;
      description: string;
    }
  | {
      type: "FOUNDER_3";
      title: string;
      description: string;
    }
  | {
      type: "PROMO_CODE";
      promotionCodeId: string;
      promotionCodeCode: string;
    };

function normalizeEmail(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizePromoCode(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getFounderOfferByEmail(
  email: string | null
): Extract<ResolvedActivationOffer, { type: "FOUNDER_1" | "FOUNDER_2" | "FOUNDER_3" }> | null {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return null;
  }

  const founder1Email = normalizeEmail(process.env.FOUNDER_1_EMAIL);
  const founder2Email = normalizeEmail(process.env.FOUNDER_2_EMAIL);
  const founder3Email = normalizeEmail(process.env.FOUNDER_3_EMAIL);

  if (founder1Email && normalizedEmail === founder1Email) {
    return {
      type: "FOUNDER_1",
      title: "Founding customer pricing applied",
      description: "First month free, then 50% off for 2 months.",
    };
  }

  if (founder2Email && normalizedEmail === founder2Email) {
    return {
      type: "FOUNDER_2",
      title: "Founding customer pricing applied",
      description: "$500 off for your first 3 months.",
    };
  }

  if (founder3Email && normalizedEmail === founder3Email) {
    return {
      type: "FOUNDER_3",
      title: "Founding customer pricing applied",
      description: "$500 off for your first 3 months.",
    };
  }

  return null;
}

function getFounderCouponId(
  offerType: "FOUNDER_1" | "FOUNDER_2" | "FOUNDER_3"
): string {
  if (offerType === "FOUNDER_1") {
    const couponId = process.env.STRIPE_50_OFF_2_MONTH_COUPON_ID;

    if (!couponId) {
      throw new Error("Missing STRIPE_50_OFF_2_MONTH_COUPON_ID");
    }

    return couponId;
  }

  const couponId = process.env.STRIPE_500_OFF_3_MONTH_COUPON_ID;

  if (!couponId) {
    throw new Error("Missing STRIPE_500_OFF_3_MONTH_COUPON_ID");
  }

  return couponId;
}

async function resolveActivationOffer(
  email: string | null,
  promoCode: string | null
): Promise<ResolvedActivationOffer> {
  const founderOffer = getFounderOfferByEmail(email);

  if (founderOffer) {
    return founderOffer;
  }

  const normalizedPromoCode = normalizePromoCode(promoCode);

  if (!normalizedPromoCode) {
    return { type: "NONE" };
  }

  const promotionCodeResult = await stripe.promotionCodes.list({
    code: normalizedPromoCode,
    active: true,
    limit: 1,
  });

  const promotionCode = promotionCodeResult.data[0] ?? null;

  if (!promotionCode) {
    throw new Error("Invalid or inactive promo code.");
  }

  return {
    type: "PROMO_CODE",
    promotionCodeId: promotionCode.id,
    promotionCodeCode: promotionCode.code,
  };
}

export async function getActivationOfferPreview() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    throw new Error("Unauthorized");
  }

  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? null;
  const founderOffer = getFounderOfferByEmail(email);

  if (!founderOffer) {
    return null;
  }

  return {
    title: founderOffer.title,
    description: founderOffer.description,
  };
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
    promoteGeneralServiceActions:
      typeof raw.promoteGeneralServiceActions === "boolean"
        ? raw.promoteGeneralServiceActions
        : false,
    generalServiceHandledByPartner:
      typeof raw.generalServiceHandledByPartner === "boolean"
        ? raw.generalServiceHandledByPartner
        : false,
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

  const isNewWorkspace = !existingMembership;

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

  const preferredServices = mergeAndDedupeServicesForIndustry({
    industry: values.industry,
    groups: [
      cleanStringArray(values.preferredServices),
      cleanStringArray(values.primaryServices),
    ],
  });

  const deprioritizedServices = mergeAndDedupeServicesForIndustry({
    industry: values.industry,
    groups: [
      cleanStringArray(values.deprioritizedServices).length > 0
        ? cleanStringArray(values.deprioritizedServices)
        : values.lowestPriorityService
          ? [values.lowestPriorityService]
          : [],
    ],
  });

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

  if (isNewWorkspace) {
    try {
      await sendWorkspaceCreatedNotification({
        ownerEmail: email,
        ownerFirstName: firstName,
        ownerLastName: lastName,
        businessName: businessProfile.businessName,
        website: businessProfile.website,
        phone: businessProfile.phone,
        city: businessProfile.city,
        state: businessProfile.state,
        industryLabel: businessProfile.industryLabel,
      });
    } catch (error) {
      console.error("Failed to send workspace created notification", {
        workspaceId: workspace.id,
        error,
      });
    }
  }

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
  promoCode?: string;
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

  if (isDemoEmail(email)) {
    await prisma.workspace.update({
      where: { id: workspace.id },
      data: {
        isDemo: true,
        status: "ACTIVE",
        activatedAt: new Date(),
        appliedOfferType: null,
        appliedPromotionCode: null,
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

  const resolvedOffer = await resolveActivationOffer(
    email,
    input.promoCode ?? null
  );

  if (
    (resolvedOffer.type === "FOUNDER_1" ||
      resolvedOffer.type === "FOUNDER_2" ||
      resolvedOffer.type === "FOUNDER_3") &&
    input.plan !== "STANDARD_MONTHLY"
  ) {
    throw new Error(
      "Founding customer pricing currently applies to the monthly plan only."
    );
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

  if (resolvedOffer.type === "FOUNDER_1") {
    const founder1CouponId = getFounderCouponId("FOUNDER_1");

    const schedule = await stripe.subscriptionSchedules.create({
      customer: customerId,
      start_date: "now",
      end_behavior: "release",
      default_settings: {
        default_payment_method: input.paymentMethodId,
      },
      metadata: {
        workspaceId: workspace.id,
        appliedOfferType: "FOUNDER_1",
      },
      phases: [
        {
          items: [{ price: priceId, quantity: 1 }],
          duration: {
            interval: "month",
            interval_count: 1,
          },
          trial: true,
          metadata: {
            workspaceId: workspace.id,
            appliedOfferType: "FOUNDER_1",
            phase: "trial",
          },
        },
        {
          items: [{ price: priceId, quantity: 1 }],
          duration: {
            interval: "month",
            interval_count: 2,
          },
          discounts: [{ coupon: founder1CouponId }],
          metadata: {
            workspaceId: workspace.id,
            appliedOfferType: "FOUNDER_1",
            phase: "discount",
          },
        },
        {
          items: [{ price: priceId, quantity: 1 }],
          metadata: {
            workspaceId: workspace.id,
            appliedOfferType: "FOUNDER_1",
            phase: "standard",
          },
        },
      ],
      expand: ["subscription"],
    });

    const scheduleSubscriptionId =
      typeof schedule.subscription === "string"
        ? schedule.subscription
        : schedule.subscription?.id ?? null;

    if (!scheduleSubscriptionId) {
      throw new Error(
        "Founding customer activation failed. Subscription was not created."
      );
    }

    const currentPeriodEnd =
      typeof schedule.current_phase?.end_date === "number"
        ? new Date(schedule.current_phase.end_date * 1000)
        : null;

    await prisma.workspace.update({
      where: { id: workspace.id },
      data: {
        isDemo: false,
        status: "ACTIVE",
        activatedAt: new Date(),
        stripeCustomerId: customerId,
        stripeSubscriptionId: scheduleSubscriptionId,
        stripeSubscriptionScheduleId: schedule.id,
        stripePriceId: priceId,
        appliedOfferType: "FOUNDER_1",
        appliedPromotionCode: null,
        cancelAtPeriodEnd: false,
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

  const subscriptionCreateParams: Stripe.SubscriptionCreateParams = {
    customer: customerId,
    items: [{ price: priceId }],
    default_payment_method: input.paymentMethodId,
    payment_behavior: "error_if_incomplete",
    payment_settings: {
      save_default_payment_method: "on_subscription",
    },
    metadata: {
      workspaceId: workspace.id,
      appliedOfferType: resolvedOffer.type,
      appliedPromotionCode:
        resolvedOffer.type === "PROMO_CODE"
          ? resolvedOffer.promotionCodeCode
          : "",
    },
  };

  if (resolvedOffer.type === "FOUNDER_2" || resolvedOffer.type === "FOUNDER_3") {
    subscriptionCreateParams.discounts = [
      {
        coupon: getFounderCouponId(resolvedOffer.type),
      },
    ];
  }

  if (resolvedOffer.type === "PROMO_CODE") {
    subscriptionCreateParams.discounts = [
      {
        promotion_code: resolvedOffer.promotionCodeId,
      },
    ];
  }

  const subscription = await stripe.subscriptions.create(subscriptionCreateParams);

  if (subscription.status !== "active" && subscription.status !== "trialing") {
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
      stripeSubscriptionScheduleId: null,
      stripePriceId: priceId,
      appliedOfferType:
        resolvedOffer.type === "NONE" ? null : resolvedOffer.type,
      appliedPromotionCode:
        resolvedOffer.type === "PROMO_CODE"
          ? resolvedOffer.promotionCodeCode
          : null,
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