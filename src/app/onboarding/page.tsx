import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { getCurrentWorkspace } from "@/lib/get-current-workspace";
import { prisma } from "@/lib/prisma";
import type { OnboardingFormData } from "@/types/onboarding";

function toFormNumber(value: number | null | undefined): number | "" {
  return typeof value === "number" ? value : "";
}

function toFormString(value: string | null | undefined): string {
  return value ?? "";
}

export default async function OnboardingPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  const workspace = await getCurrentWorkspace();

  if (workspace?.status === "ACTIVE") {
    redirect("/settings?intent=finalize&focus=service-pricing");
  }

  if (!workspace) {
    return <OnboardingFlow />;
  }

  const fullWorkspace = await prisma.workspace.findUnique({
    where: { id: workspace.id },
    include: {
      businessProfile: true,
      competitors: {
        orderBy: [{ isPrimaryCompetitor: "desc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!fullWorkspace || !fullWorkspace.businessProfile) {
    return <OnboardingFlow />;
  }

  const profile = fullWorkspace.businessProfile;

  const initialData: OnboardingFormData = {
    businessName: profile.businessName ?? "",
    website: toFormString(profile.website),
    logoUrl: toFormString(profile.logoUrl),
    phone: toFormString(profile.phone),

    city: profile.city ?? "",
    state: toFormString(profile.state),
    serviceArea: profile.serviceArea ?? "",
    serviceAreaRadiusMiles: toFormNumber(profile.serviceAreaRadiusMiles),
    industry: fullWorkspace.industry ?? "PLUMBING",
    industryLabel: toFormString(profile.industryLabel),
    brandTone: profile.brandTone ?? "PROFESSIONAL",

    preferredServices: profile.preferredServices ?? [],
    primaryServices: profile.preferredServices ?? [],
    deprioritizedServices: profile.deprioritizedServices ?? [],

    averageJobValue: toFormNumber(
      profile.averageJobValue ? Number(profile.averageJobValue) : null
    ),
    highestMarginService: toFormString(profile.highestMarginService),
    lowestPriorityService: toFormString(profile.lowestPriorityService),

    technicians: toFormNumber(profile.technicians),
    jobsPerTechnicianPerDay: toFormNumber(profile.jobsPerTechnicianPerDay),
    weeklyCapacity: toFormNumber(profile.weeklyCapacity),
    targetWeeklyRevenue: toFormNumber(
      profile.targetWeeklyRevenue ? Number(profile.targetWeeklyRevenue) : null
    ),
    monthlyActionBudget: toFormNumber(
      profile.monthlyActionBudget ? Number(profile.monthlyActionBudget) : null
    ),

    competitors: fullWorkspace.competitors.map((competitor) => ({
      name: competitor.name ?? "",
      websiteUrl: competitor.websiteUrl ?? "",
      googleBusinessUrl: competitor.googleBusinessUrl ?? "",
      logoUrl: competitor.logoUrl ?? "",
      isPrimaryCompetitor: competitor.isPrimaryCompetitor ?? false,
      placeId: competitor.googlePlaceId ?? "",
      rating: typeof competitor.rating === "number" ? competitor.rating : "",
      reviewCount:
        typeof competitor.reviewCount === "number"
          ? competitor.reviewCount
          : "",
    })),

    hasServicePages: profile.hasServicePages ?? false,
    hasFaqContent: profile.hasFaqContent ?? false,
    hasFaqPage: false,
    hasBlog: profile.hasBlog ?? false,
    hasGoogleBusinessPage: profile.hasGoogleBusinessPage ?? false,
    googleBusinessProfileUrl: toFormString(profile.googleBusinessProfileUrl),
    googlePlaceId: toFormString(profile.googlePlaceId),
    googleRating: toFormNumber(profile.googleRating),
    googleReviewCount: toFormNumber(profile.googleReviewCount),
    servicePageUrls: profile.servicePageUrls ?? [],

    busySeason: toFormString(profile.busySeason),
    slowSeason: toFormString(profile.slowSeason),
    busyMonths: profile.busyMonths ?? [],
    slowMonths: profile.slowMonths ?? [],
    seasonalityNotes: toFormString(profile.seasonalityNotes),
  };

  const initialStep =
    fullWorkspace.status === "PENDING_ACTIVATION" &&
    Boolean(fullWorkspace.onboardingCompletedAt)
      ? 6
      : 0;

  return (
    <OnboardingFlow
      initialData={initialData}
      initialStep={initialStep}
    />
  );
}