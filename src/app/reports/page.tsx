import { redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/get-current-workspace";
import { prisma } from "@/lib/prisma";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";

type ActionReportRow = {
  id: string;
  name: string;
  status: string;
  estimatedRevenue: number;
  leads: number;
  bookedJobs: number;
  capturedRevenue: number;
  roiDisplay: string;
};



function formatStatusLabel(status: string) {
  switch (status) {
    case "READY":
      return "Draft Ready";
    case "APPROVED":
      return "Approved";
    case "SCHEDULED":
      return "Queued";
    case "LAUNCHED":
      return "Launched";
    case "COMPLETED":
      return "Completed";
    default:
      return status;
  }
}

export default async function ReportsPage() {
  const workspace = await getCurrentWorkspace();

  if (!workspace || !workspace.onboardingCompletedAt) {
    redirect("/onboarding");
  }

  const campaigns = await prisma.campaign.findMany({
    where: { workspaceId: workspace.id },
    include: {
      leads: true,
      attributions: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const rows: ActionReportRow[] = campaigns.map((campaign) => {
    const leads = campaign.leads.length;
    const bookedLeads = campaign.leads.filter((lead) => lead.status === "BOOKED");
    const bookedJobs = bookedLeads.length;

    const actualLeadRevenue = bookedLeads.reduce((sum, lead) => {
      return sum + Number(lead.bookedRevenue ?? 0);
    }, 0);

    const attributedRevenue = campaign.attributions.reduce((sum, entry) => {
      return sum + Number(entry.revenue ?? 0);
    }, 0);

        const capturedRevenue = actualLeadRevenue + attributedRevenue;

    const avgRoi =
      campaign.attributions.length > 0
        ? campaign.attributions.reduce((sum, entry) => sum + (entry.roi ?? 0), 0) /
          campaign.attributions.length
        : 0;

    return {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      estimatedRevenue: Number(campaign.estimatedRevenue ?? 0),
      leads,
      bookedJobs,
      capturedRevenue,
      roiDisplay: avgRoi > 0 ? `${avgRoi.toFixed(1)}x` : "—",
    };
  });

  const totalRevenue = rows.reduce((sum, row) => sum + row.capturedRevenue, 0);
  const totalBookedJobs = rows.reduce((sum, row) => sum + row.bookedJobs, 0);
  const totalLeads = rows.reduce((sum, row) => sum + row.leads, 0);
  const actionsWithRevenue = rows.filter((row) => row.capturedRevenue > 0).length;
  const leadToJobRate =
    totalLeads > 0 ? Math.round((totalBookedJobs / totalLeads) * 100) : 0;

  return (
    <div className="mf-page-shell min-h-screen px-4 py-5 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5 lg:flex-row">
        <DashboardSidebar />

        <main className="min-w-0 flex-1 space-y-5">
          <section className="mf-dark-panel mf-grid-glow rounded-3xl px-5 py-5 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#F5B942]">
              Reports
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white md:text-3xl">
              Revenue attribution and performance
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">
              Track booked jobs, captured revenue, and action performance across
              the workspace.
            </p>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="mf-card rounded-2xl p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                Revenue Captured
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
                ${totalRevenue.toLocaleString()}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                  Revenue recorded from booked leads and attribution entries
              </p>
            </div>

            <div className="mf-card rounded-2xl p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                Booked Jobs
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
                {totalBookedJobs}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                Jobs converted from tracked leads
              </p>
            </div>

            <div className="mf-card rounded-2xl p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                Lead-to-Job Rate
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
                {leadToJobRate}%
              </p>
              <p className="mt-1 text-sm text-gray-600">
                Conversion from lead to booked work
              </p>
            </div>

            <div className="mf-card rounded-2xl p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                Actions With Revenue
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
                {actionsWithRevenue}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                Actions that have produced measurable value
              </p>
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                Action Revenue Detail
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-600">
                      Action
                    </th>
                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-600">
                      Status
                    </th>
                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-600">
                      Leads
                    </th>
                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-600">
                      Booked Jobs
                    </th>
                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-600">
                      Captured Revenue
                    </th>
                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-600">
                      Est Revenue
                    </th>
                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-600">
                      ROI
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-gray-200">
                      <td className="px-5 py-4 text-sm font-semibold text-gray-900">
                        {row.name}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-700">
                        {formatStatusLabel(row.status)}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-700">
                        {row.leads}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-700">
                        {row.bookedJobs}
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-emerald-700">
                        ${row.capturedRevenue.toLocaleString()}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-700">
                        ${row.estimatedRevenue.toLocaleString()}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-700">
                        {row.roiDisplay}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}