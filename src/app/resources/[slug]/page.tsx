import { notFound, redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { MarkdownDocument } from "@/components/resources/markdown-document";
import { getCurrentWorkspace } from "@/lib/get-current-workspace";
import { prisma } from "@/lib/prisma";
import { getResourceBySlug } from "@/lib/resources";
import { EXTERNAL_RESOURCE_CONFIG } from "@/lib/external-resources";

export default async function ExternalResourcePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
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

  const { slug } = await params;
  const resource = await getResourceBySlug("external", slug);

  if (!resource) {
    return notFound();
  }

  const config = EXTERNAL_RESOURCE_CONFIG.find((item) => item.slug === slug);

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
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#F5B942]">
                {config?.eyebrow ?? "Resource"}
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#081018] md:text-4xl">
                {config?.title ?? resource.title}
              </h1>

              <p className="mt-3 text-sm leading-6 text-gray-600 md:text-base">
                {config?.description ?? resource.summary}
              </p>
            </div>
          </section>

          <article className="mf-card rounded-3xl px-6 py-6 md:px-8 md:py-8">
            <div className="prose prose-neutral max-w-none prose-headings:tracking-tight prose-headings:text-[#081018] prose-p:text-gray-700 prose-li:text-gray-700">
              <MarkdownDocument markdown={resource.markdown} />
            </div>
          </article>
        </main>
      </div>
    </div>
  );
}