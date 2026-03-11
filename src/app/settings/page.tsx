import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { getCurrentWorkspace } from "@/lib/get-current-workspace";
import { prisma } from "@/lib/prisma";
import { SettingsForm } from "@/components/settings/settings-form";
import type { OnboardingFormData } from "@/types/onboarding";

function toFormNumber(value: number | null | undefined): number | "" {
  return typeof value === "number" ? value : "";
}

function toFormString(value: string | null | undefined): string {
  return value ?? "";
}

export default async function SettingsPage() {
  const workspace = await getCurrentWorkspace();

  if (!workspace || !workspace.onboardingCompletedAt) {
    redirect("/onboarding");
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
    redirect("/onboarding");
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
    targetBookedJobsPerWeek: profile.targetBookedJobsPerWeek ?? null,

    competitors: fullWorkspace.competitors.map((competitor) => ({
      name: competitor.name ?? "",
      websiteUrl: competitor.websiteUrl ?? "",
      googleBusinessUrl: competitor.googleBusinessUrl ?? "",
      logoUrl: competitor.logoUrl ?? "",
      isPrimaryCompetitor: competitor.isPrimaryCompetitor ?? false,
    })),

    hasServicePages: profile.hasServicePages ?? false,
    hasFaqContent: profile.hasFaqContent ?? false,
    hasFaqPage: profile.hasFaqContent ?? false,
    hasBlog: profile.hasBlog ?? false,
    hasGoogleBusinessPage: profile.hasGoogleBusinessPage ?? false,
    googleBusinessProfileUrl: toFormString(profile.googleBusinessProfileUrl),
    servicePageUrls: profile.servicePageUrls ?? [],

    busySeason: toFormString(profile.busySeason),
    slowSeason: toFormString(profile.slowSeason),
    busyMonths: profile.busyMonths ?? [],
    slowMonths: profile.slowMonths ?? [],
    seasonalityNotes: toFormString(profile.seasonalityNotes),
  };

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row">
        <DashboardSidebar />

        <main className="flex-1">
          <SettingsForm
            workspaceName={fullWorkspace.name}
            isDemo={fullWorkspace.isDemo}
            initialData={initialData}
          />
        </main>
      </div>
    </div>
  );
}