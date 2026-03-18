import { redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/get-current-workspace";
import { prisma } from "@/lib/prisma";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { ExecutionBoard } from "@/components/execution/execution-board";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

export default async function ExecutionPage() {
  const workspace = await getCurrentWorkspace();

  if (!workspace || !workspace.onboardingCompletedAt) {
    redirect("/onboarding");
  }

  const profile = await prisma.businessProfile.findUnique({
    where: { workspaceId: workspace.id },
    select: { logoUrl: true, businessName: true },
  });

  const campaigns = await prisma.campaign.findMany({
    where: {
      workspaceId: workspace.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const approvedCount = campaigns.filter((c) => c.status === "APPROVED").length;
  const queuedCount = campaigns.filter((c) => c.status === "SCHEDULED").length;
  const launchedCount = campaigns.filter((c) => c.status === "LAUNCHED").length;
  const completedCount = campaigns.filter((c) => c.status === "COMPLETED").length;

  return (
    <div className="mf-page-shell min-h-screen px-4 py-5 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5 lg:flex-row">
        <DashboardSidebar />

        <main className="min-w-0 flex-1 space-y-5">
                    <DashboardHeader
            workspaceName={profile?.businessName ?? workspace.name}
            logoUrl={profile?.logoUrl ?? null}
          />
          <section className="mf-dark-panel mf-grid-glow rounded-3xl px-5 py-5 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#F5B942]">
              Action Execution
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white md:text-3xl">
              Managed launch workflow
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">
              Review approved actions, move them into queue, track launch
              progress, and keep execution organized from draft to completion.
            </p>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="mf-card rounded-2xl p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                Approved
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
                {approvedCount}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                Ready to move into queue
              </p>
            </div>

            <div className="mf-card rounded-2xl p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                Queued
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
                {queuedCount}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                Scheduled for managed launch
              </p>
            </div>

            <div className="mf-card rounded-2xl p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                Launched
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
                {launchedCount}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                Live and being tracked
              </p>
            </div>

            <div className="mf-card rounded-2xl p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                Completed
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
                {completedCount}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                Closed and retained for reporting
              </p>
            </div>
          </section>

          <ExecutionBoard campaigns={campaigns} />
        </main>
      </div>
    </div>
  );
}