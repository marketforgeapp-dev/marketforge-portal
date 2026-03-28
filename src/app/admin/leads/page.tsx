import { prisma } from "@/lib/prisma";
import { LeadsTable } from "@/components/leads/leads-table";
import { AdminCustomerSwitcher } from "@/components/admin/admin-customer-switcher";

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ workspaceId?: string }>;
}) {
  const { workspaceId } = await searchParams;
  const selectedWorkspaceId = workspaceId ?? null;

  const [workspaces, leads] = await Promise.all([
    prisma.workspace.findMany({
      include: {
        businessProfile: {
          select: {
            businessName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.lead.findMany({
      where: selectedWorkspaceId ? { workspaceId: selectedWorkspaceId } : undefined,
      include: {
        campaign: true,
        revenueOpportunity: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  const workspaceOptions = workspaces.map((workspace) => ({
    id: workspace.id,
    label: workspace.businessProfile?.businessName ?? workspace.name,
  }));

  const selectedWorkspaceName =
    workspaces.find((workspace) => workspace.id === selectedWorkspaceId)
      ?.businessProfile?.businessName ??
    workspaces.find((workspace) => workspace.id === selectedWorkspaceId)?.name ??
    "All customers";

  const bookedCount = leads.filter((lead) => lead.status === "BOOKED").length;
  const newCount = leads.filter((lead) => lead.status === "NEW").length;
  const contactedCount = leads.filter(
    (lead) =>
      lead.status === "CONTACTED" || lead.status === "ESTIMATE_SCHEDULED"
  ).length;

  return (
    <>
      <section className="rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-5 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#F5B942]">
          Leads
        </p>

        <h2 className="mt-2 text-2xl font-bold tracking-tight text-white md:text-3xl">
          {selectedWorkspaceId
            ? `${selectedWorkspaceName} lead pipeline`
            : "Lead pipeline across all customers"}
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">
          Review incoming leads, booked jobs, and action attribution from one admin view.
        </p>
      </section>

      <AdminCustomerSwitcher
        basePath="/admin/leads"
        workspaces={workspaceOptions}
        selectedWorkspaceId={selectedWorkspaceId}
      />

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white p-4 text-gray-900">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">
            Total Leads
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{leads.length}</p>
          <p className="mt-1 text-sm text-gray-600">
            All leads in the selected view
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white p-4 text-gray-900">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">
            New Leads
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{newCount}</p>
          <p className="mt-1 text-sm text-gray-600">Waiting for first follow-up</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white p-4 text-gray-900">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">
            Booked Jobs
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{bookedCount}</p>
          <p className="mt-1 text-sm text-gray-600">
            {contactedCount} actively being worked
          </p>
        </div>
      </section>

      <LeadsTable leads={leads} />
    </>
  );
}