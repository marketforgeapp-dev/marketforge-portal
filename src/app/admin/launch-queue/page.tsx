import { prisma } from "@/lib/prisma";
import { ExecutionBoard } from "@/components/execution/execution-board";
import { AdminCustomerSwitcher } from "@/components/admin/admin-customer-switcher";

export default async function AdminLaunchQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ workspaceId?: string }>;
}) {
  const { workspaceId } = await searchParams;
  const selectedWorkspaceId = workspaceId ?? null;

  const workspaces = await prisma.workspace.findMany({
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
  });

  const campaigns = await prisma.campaign.findMany({
    where: selectedWorkspaceId ? { workspaceId: selectedWorkspaceId } : undefined,
    orderBy: {
      createdAt: "desc",
    },
  });

  const campaignAssets = await prisma.campaignAsset.findMany({
    where: {
      campaignId: {
        in: campaigns.map((campaign) => campaign.id),
      },
    },
    select: {
      id: true,
      campaignId: true,
      assetType: true,
      isApproved: true,
    },
  });

  const campaignsWithAssets = campaigns.map((campaign) => ({
    ...campaign,
    campaignAssets: campaignAssets
      .filter((asset) => asset.campaignId === campaign.id)
      .map(({ id, assetType, isApproved }) => ({
        id,
        assetType,
        isApproved,
      })),
  }));

  const approvedCount = campaigns.filter((c) => c.status === "APPROVED").length;
  const queuedCount = campaigns.filter((c) => c.status === "SCHEDULED").length;
  const launchedCount = campaigns.filter((c) => c.status === "LAUNCHED").length;
  const completedCount = campaigns.filter((c) => c.status === "COMPLETED").length;

  const workspaceOptions = workspaces.map((workspace) => ({
    id: workspace.id,
    label: workspace.businessProfile?.businessName ?? workspace.name,
  }));

  const selectedWorkspaceName =
    workspaces.find((workspace) => workspace.id === selectedWorkspaceId)
      ?.businessProfile?.businessName ??
    workspaces.find((workspace) => workspace.id === selectedWorkspaceId)?.name ??
    "All customers";

  return (
    <>
      <section className="rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-5 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#F5B942]">
          Launch Queue
        </p>

        <h2 className="mt-2 text-2xl font-bold tracking-tight text-white md:text-3xl">
          {selectedWorkspaceId
            ? `${selectedWorkspaceName} launch workflow`
            : "Launch workflow across all customers"}
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">
          Review approved actions, move them into queue, track launch progress,
          and manage execution from one place.
        </p>
      </section>

      <AdminCustomerSwitcher
        basePath="/admin/launch-queue"
        workspaces={workspaceOptions}
        selectedWorkspaceId={selectedWorkspaceId}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white p-4 text-gray-900">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">
            Approved
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{approvedCount}</p>
          <p className="mt-1 text-sm text-gray-600">Ready to move into queue</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white p-4 text-gray-900">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">
            Queued
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{queuedCount}</p>
          <p className="mt-1 text-sm text-gray-600">Scheduled for launch</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white p-4 text-gray-900">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">
            Launched
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{launchedCount}</p>
          <p className="mt-1 text-sm text-gray-600">Live and being tracked</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white p-4 text-gray-900">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">
            Completed
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{completedCount}</p>
          <p className="mt-1 text-sm text-gray-600">Closed and retained</p>
        </div>
      </section>

      <ExecutionBoard campaigns={campaignsWithAssets} />
    </>
  );
}