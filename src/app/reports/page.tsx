import { redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/get-current-workspace";
import { seedDemoWorkspaceData } from "@/lib/seed-demo-workspace-data";
import { prisma } from "@/lib/prisma";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";

type CampaignReportRow = {
  id: string;
  name: string;
  status: string;
  estimatedRevenue: number;
  leads: number;
  bookedJobs: number;
  actualRevenue: number;
  roiDisplay: string;
};

function calculateFallbackRevenue(params: {
  bookedJobs: number;
  estimatedBookedJobs: number | null;
  estimatedRevenue: unknown;
}) {
  const { bookedJobs, estimatedBookedJobs, estimatedRevenue } = params;

  const totalEstimatedRevenue = Number(estimatedRevenue ?? 0);
  const estimatedJobs = estimatedBookedJobs ?? 0;

  if (bookedJobs <= 0) return 0;
  if (totalEstimatedRevenue <= 0 || estimatedJobs <= 0) return 0;

  const perJobRevenue = totalEstimatedRevenue / Math.max(estimatedJobs, 1);
  return Math.round(bookedJobs * perJobRevenue);
}

export default async function ReportsPage() {
  const workspace = await getCurrentWorkspace();

  if (!workspace || !workspace.onboardingCompletedAt) {
    redirect("/onboarding");
  }

  await seedDemoWorkspaceData(workspace.id);

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

  const rows: CampaignReportRow[] = campaigns.map((campaign) => {
    const leads = campaign.leads.length;
    const bookedLeads = campaign.leads.filter((lead) => lead.status === "BOOKED");
    const bookedJobs = bookedLeads.length;

    const actualLeadRevenue = bookedLeads.reduce((sum, lead) => {
      return sum + Number(lead.bookedRevenue ?? 0);
    }, 0);

    const attributedRevenue = campaign.attributions.reduce((sum, entry) => {
      return sum + Number(entry.revenue ?? 0);
    }, 0);

    const fallbackRevenue = calculateFallbackRevenue({
      bookedJobs,
      estimatedBookedJobs: campaign.estimatedBookedJobs,
      estimatedRevenue: campaign.estimatedRevenue,
    });

    const actualRevenue =
      actualLeadRevenue > 0
        ? actualLeadRevenue
        : attributedRevenue > 0
          ? attributedRevenue
          : fallbackRevenue;

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
      actualRevenue,
      roiDisplay: avgRoi > 0 ? `${avgRoi.toFixed(1)}x` : "—",
    };
  });

  const totalRevenue = rows.reduce((sum, row) => sum + row.actualRevenue, 0);
  const totalBookedJobs = rows.reduce((sum, row) => sum + row.bookedJobs, 0);
  const totalLeads = rows.reduce((sum, row) => sum + row.leads, 0);
  const campaignsWithRevenue = rows.filter((row) => row.actualRevenue > 0).length;
  const leadToJobRate =
    totalLeads > 0 ? Math.round((totalBookedJobs / totalLeads) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row">
        <DashboardSidebar />

        <main className="flex-1 space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              Reports
            </p>

            <h1 className="mt-2 text-3xl font-bold text-gray-900">
              Attribution & Performance
            </h1>

            <p className="mt-2 text-gray-600">
              Track booked jobs, real revenue captured, and campaign performance.
            </p>
          </div>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                Revenue Captured
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                ${totalRevenue.toLocaleString()}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                Booked Jobs
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {totalBookedJobs}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                Lead-to-Job Rate
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {leadToJobRate}%
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                Campaigns With Revenue
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {campaignsWithRevenue}
              </p>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
              <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Campaign Revenue Detail
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Campaign
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Status
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Leads
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Booked Jobs
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Real Revenue
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Est Revenue
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600">
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
                        {row.status}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-700">
                        {row.leads}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-700">
                        {row.bookedJobs}
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-emerald-700">
                        ${row.actualRevenue.toLocaleString()}
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