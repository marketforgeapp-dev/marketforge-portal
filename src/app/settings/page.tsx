import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { getCurrentWorkspace } from "@/lib/get-current-workspace";
import { prisma } from "@/lib/prisma";
import { SettingsForm } from "@/components/settings/settings-form";
import type { OnboardingFormData } from "@/types/onboarding";
import { currentUser } from "@clerk/nextjs/server";

function toFormNumber(value: number | null | undefined): number | "" {
  return typeof value === "number" ? value : "";
}

function toFormString(value: string | null | undefined): string {
  return value ?? "";
}

export default async function SettingsPage() {
  const workspace = await getCurrentWorkspace();
  const user = await currentUser();
  const primaryEmail = user?.emailAddresses?.[0]?.emailAddress ?? null;

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
    servicePricing: Array.isArray(profile.servicePricingJson)
  ? (profile.servicePricingJson as {
      serviceName: string;
      averageRevenue: number | "";
    }[])
  : [],

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
    hasFaqPage: false,
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
    <div className="mf-page-shell min-h-screen px-4 py-5 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5 lg:flex-row">
        <DashboardSidebar />

        <main className="min-w-0 flex-1 space-y-5">
                    <DashboardHeader
            workspaceName={profile.businessName ?? workspace.name}
            logoUrl={profile.logoUrl ?? null}
          />
          <section className="mf-dark-panel mf-grid-glow rounded-3xl px-5 py-5 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#F5B942]">
              Settings
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white md:text-3xl">
              Workspace and business profile
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">
  Update the business profile, services, pricing, competitors, and capacity
  signals that MarketForge uses to calculate revenue opportunities,
  prioritize actions, and generate campaign recommendations.
</p>
          </section>

          <SettingsForm
            workspaceName={fullWorkspace.name}
            isDemo={fullWorkspace.isDemo}
            initialData={initialData}
            primaryEmail={primaryEmail}
          />
        </main>
      </div>
    </div>
  );
}