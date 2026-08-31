import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CopyDeveloperBriefButton } from "@/components/aeo/copy-developer-brief-button";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { getCurrentWorkspace } from "@/lib/get-current-workspace";
import { prisma } from "@/lib/prisma";
import type { WebsiteImplementationPlan } from "@/app/aeo/actions";

type Props = {
  params: Promise<{
    planId: string;
  }>;
};

function parsePlan(
  value: unknown
): WebsiteImplementationPlan | null {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  return value as WebsiteImplementationPlan;
}

function formatGapType(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
}

export default async function WebsiteImplementationPlanPage({
  params,
}: Props) {
  const { planId } = await params;

  const workspace =
    await getCurrentWorkspace();

  if (
    !workspace ||
    !workspace.onboardingCompletedAt
  ) {
    redirect("/onboarding");
  }

  const implementationPlan =
    await prisma.websiteImplementationPlan.findFirst({
      where: {
        id: planId,
        workspaceId: workspace.id,
      },
    });

  if (!implementationPlan) {
    notFound();
  }

  const profile =
    await prisma.businessProfile.findUnique({
      where: {
        workspaceId: workspace.id,
      },

      select: {
        businessName: true,
        logoUrl: true,
        website: true,
      },
    });

  if (!profile) {
    redirect("/dashboard");
  }

  const plan = parsePlan(
    implementationPlan.planJson
  );

  if (!plan) {
    notFound();
  }

  return (
    <div className="mf-page-shell min-h-screen px-4 py-5 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5 lg:flex-row">
        <DashboardSidebar />

        <main className="min-w-0 flex-1 space-y-5">
          <DashboardHeader
            workspaceName={
              profile.businessName ??
              workspace.name
            }
            logoUrl={
              profile.logoUrl ?? null
            }
          />

          <section className="mf-dark-panel mf-grid-glow rounded-3xl px-5 py-5 text-white">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#F5B942]">
                  Website Implementation Plan
                </p>

                <h1 className="mt-2 text-2xl font-bold tracking-tight text-white md:text-3xl">
                  {implementationPlan.title}
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">
                  MarketForge prepared the website structure, content
                  requirements, and implementation guidance your website
                  team needs to make this improvement.
                </p>
              </div>

              <Link
                href="/aeo"
                className="shrink-0 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15"
              >
                Back to Website Intelligence
              </Link>
            </div>
          </section>

          <section className="mf-card rounded-3xl p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                Website Change Recommended
              </span>

              <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700">
                {formatGapType(
                  implementationPlan.gapType
                )}
              </span>

              {implementationPlan.service ? (
                <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700">
                  {implementationPlan.service}
                </span>
              ) : null}
            </div>

            <h2 className="mt-4 text-xl font-bold text-gray-900">
              What needs to change
            </h2>

            <p className="mt-2 max-w-4xl text-sm leading-6 text-gray-700">
              {plan.overview}
            </p>

            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="max-w-4xl">
                    <p className="text-sm font-semibold text-gray-900">
                      Your next step
                    </p>

                    <p className="mt-1 text-sm leading-6 text-gray-700">
                      Send this plan to whoever manages your website. MarketForge has already
                      worked out what should change, why it matters, and how the pages should
                      be structured.
                    </p>

                    <p className="mt-3 text-sm font-semibold text-gray-900">
                      Brief for your web developer
                    </p>

                    <p className="mt-1 text-sm leading-6 text-gray-700">
                      {plan.developerSummary}
                    </p>
                  </div>

                  <CopyDeveloperBriefButton
                    text={plan.developerSummary}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="mf-card rounded-3xl p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
              Page Plan
            </p>

            <h2 className="mt-2 text-xl font-bold text-gray-900">
              Pages to create or improve
            </h2>

            <div className="mt-5 space-y-4">
              {plan.recommendedPages.map(
                (page, pageIndex) => (
                  <article
                    key={`${page.pageName}-${pageIndex}`}
                    className="rounded-2xl border border-gray-200 bg-gray-50 p-5"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                          Page {pageIndex + 1}
                        </p>

                        <h3 className="mt-1 text-lg font-bold text-gray-900">
                          {page.pageName}
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-gray-600">
                          {page.purpose}
                        </p>
                      </div>

                      {page.suggestedPath ? (
                        <span className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700">
                          {page.suggestedPath}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                        Recommended H1
                      </p>

                      <p className="mt-2 text-sm font-semibold text-gray-900">
                        {page.h1Recommendation}
                      </p>
                    </div>

                    <div className="mt-4 space-y-3">
                      {page.contentSections.map(
                        (section, sectionIndex) => (
                          <div
                            key={`${section.heading}-${sectionIndex}`}
                            className="rounded-xl border border-gray-200 bg-white p-4"
                          >
                            <p className="text-sm font-semibold text-gray-900">
                              {section.heading}
                            </p>

                            <p className="mt-1 text-sm leading-6 text-gray-600">
                              {section.purpose}
                            </p>

                            <ul className="mt-3 space-y-2">
                              {section.contentRequirements.map(
                                (requirement) => (
                                  <li
                                    key={requirement}
                                    className="flex gap-2 text-sm leading-5 text-gray-700"
                                  >
                                    <span aria-hidden="true">
                                      •
                                    </span>

                                    <span>
                                      {requirement}
                                    </span>
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        )
                      )}
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                          SEO Title Guidance
                        </p>

                        <p className="mt-2 text-sm leading-6 text-gray-700">
                          {
                            page.seoGuidance
                              .titleGuidance
                          }
                        </p>
                      </div>

                      <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                          Meta Description Guidance
                        </p>

                        <p className="mt-2 text-sm leading-6 text-gray-700">
                          {
                            page.seoGuidance
                              .metaDescriptionGuidance
                          }
                        </p>
                      </div>
                    </div>
                  </article>
                )
              )}
            </div>
          </section>

          {plan.internalLinking.length > 0 ? (
            <section className="mf-card rounded-3xl p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                Internal Linking
              </p>

              <h2 className="mt-2 text-xl font-bold text-gray-900">
                How these pages should connect
              </h2>

              <div className="mt-4 space-y-3">
                {plan.internalLinking.map(
                  (link, index) => (
                    <div
                      key={`${link.from}-${link.to}-${index}`}
                      className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                    >
                      <p className="text-sm font-semibold text-gray-900">
                        {link.from} → {link.to}
                      </p>

                      <p className="mt-1 text-sm leading-6 text-gray-600">
                        {link.reason}
                      </p>
                    </div>
                  )
                )}
              </div>
            </section>
          ) : null}

          <section className="grid gap-5 xl:grid-cols-2">
            <div className="mf-card rounded-3xl p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                Implementation Checklist
              </p>

              <div className="mt-4 space-y-3">
                {plan.implementationChecklist.map(
                  (item) => (
                    <div
                      key={item}
                      className="flex gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3"
                    >
                      <span aria-hidden="true">
                        □
                      </span>

                      <p className="text-sm leading-6 text-gray-700">
                        {item}
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="mf-card rounded-3xl p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                After Implementation
              </p>

              <h2 className="mt-2 text-lg font-bold text-gray-900">
                How to verify the change
              </h2>

              <div className="mt-4 space-y-3">
                {plan.verificationChecklist.map(
                  (item) => (
                    <div
                      key={item}
                      className="flex gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3"
                    >
                      <span aria-hidden="true">
                        ✓
                      </span>

                      <p className="text-sm leading-6 text-gray-700">
                        {item}
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          </section>

          {plan.sitewideChanges.length > 0 ? (
            <section className="mf-card rounded-3xl p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                Sitewide Changes
              </p>

              <div className="mt-4 space-y-2">
                {plan.sitewideChanges.map(
                  (item) => (
                    <p
                      key={item}
                      className="text-sm leading-6 text-gray-700"
                    >
                      • {item}
                    </p>
                  )
                )}
              </div>
            </section>
          ) : null}
          <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">
              What Happens After The Change
            </p>

            <h2 className="mt-2 text-lg font-bold text-gray-900">
              MarketForge will check the live website again
            </h2>

            <p className="mt-2 max-w-4xl text-sm leading-6 text-gray-700">
              Making the change does not automatically improve your Website Intelligence
              assessment. MarketForge will evaluate the live website during a future
              review and update its assessment only when the improvement can actually be
              observed.
            </p>
          </section>
          <section className="rounded-3xl border border-gray-200 bg-gray-50 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
              Before Publishing
            </p>

            <h2 className="mt-2 text-lg font-bold text-gray-900">
              Facts your website team should verify
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              Do not add these details unless the business has confirmed they are accurate.
            </p>

            <div className="mt-4 space-y-2">
              {plan.claimGuardrails.map(
                (item) => (
                  <p
                    key={item}
                    className="text-sm leading-6 text-gray-700"
                  >
                    • {item}
                  </p>
                )
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}