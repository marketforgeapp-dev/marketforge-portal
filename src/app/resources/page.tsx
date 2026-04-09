import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { ResourceAccordion } from "@/components/resources/resource-accordion";
import { getCurrentWorkspace } from "@/lib/get-current-workspace";
import { prisma } from "@/lib/prisma";
import { getResourcesByAudience, getResourceBySlug } from "@/lib/resources";

export default async function ResourcesPage() {
  const workspace = await getCurrentWorkspace();

  if (!workspace) {
    redirect("/onboarding");
  }

  if (!workspace.onboardingCompletedAt) {
    redirect("/onboarding");
  }

  const profile = await prisma.businessProfile.findUnique({
    where: { workspaceId: workspace.id },
  });

  if (!profile) {
    redirect("/onboarding");
  }

  const resourceMeta = await getResourcesByAudience("external");

  const resources: Array<{
    slug: string;
    title: string;
    summary: string;
    markdown: string;
  }> = [];

  for (const item of resourceMeta) {
    const resource = await getResourceBySlug("external", item.slug);

    if (!resource) {
      continue;
    }

    resources.push({
      slug: resource.slug,
      title: resource.title,
      summary: resource.summary,
      markdown: resource.markdown,
    });
  }

  return (
    <div className="mf-page-shell min-h-screen px-4 py-5 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5 lg:flex-row">
        <DashboardSidebar />

        <main className="min-w-0 flex-1 space-y-5">
          <DashboardHeader
            workspaceName={workspace.name}
            logoUrl={profile.logoUrl}
          />

          <section className="mf-card rounded-3xl p-6 md:p-8">
            <div className="max-w-4xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#D79C11]">
                Resources
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-950 md:text-4xl">
                Execution, reporting, access, and policy guidance
              </h1>

              <p className="mt-3 text-sm leading-6 text-gray-600 md:text-base">
                Review the documents that support action execution, reporting,
                platform access, support, and the core policies behind your use
                of MarketForge.
              </p>
            </div>
          </section>

          <ResourceAccordion resources={resources} />
        </main>
      </div>
    </div>
  );
}