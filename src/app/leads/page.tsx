import { redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/get-current-workspace";
import { prisma } from "@/lib/prisma";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { LeadsTable } from "@/components/leads/leads-table";
import { LeadIntakePanel } from "@/components/leads/lead-intake-panel";

export default async function LeadsPage() {
  const workspace = await getCurrentWorkspace();

  if (!workspace || !workspace.onboardingCompletedAt) {
    redirect("/onboarding");
  }

  const profile = await prisma.businessProfile.findUnique({
    where: { workspaceId: workspace.id },
    select: { logoUrl: true, businessName: true },
  });

  const [leads, campaigns] = await Promise.all([
    prisma.lead.findMany({
      where: { workspaceId: workspace.id },
      include: {
        campaign: true,
        revenueOpportunity: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.campaign.findMany({
      where: { workspaceId: workspace.id },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  const bookedCount = leads.filter((lead) => lead.status === "BOOKED").length;
  const newCount = leads.filter((lead) => lead.status === "NEW").length;
  const contactedCount = leads.filter(
    (lead) =>
      lead.status === "CONTACTED" || lead.status === "ESTIMATE_SCHEDULED"
  ).length;

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
              Leads
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white md:text-3xl">
              Lead to booked job workflow
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">
              Track incoming leads from MarketForge actions, move them through
              the booking pipeline, and record booked revenue as work closes.
            </p>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <div className="mf-card rounded-2xl p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                Total Leads
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
                {leads.length}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                All leads currently tracked in the workspace
              </p>
            </div>

            <div className="mf-card rounded-2xl p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                New Leads
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
                {newCount}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                Waiting for first follow-up
              </p>
            </div>

            <div className="mf-card rounded-2xl p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                Booked Jobs
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
                {bookedCount}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                {contactedCount} actively being worked
              </p>
            </div>
          </section>

          <LeadIntakePanel
            campaigns={campaigns}
            workspaceId={workspace.id}
          />

          <LeadsTable leads={leads} />
        </main>
      </div>
    </div>
  );
}