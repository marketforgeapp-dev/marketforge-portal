import Link from "next/link";

type WorkspaceOption = {
  id: string;
  label: string;
};

type Props = {
  basePath: "/admin/launch-queue" | "/admin/leads";
  workspaces: WorkspaceOption[];
  selectedWorkspaceId: string | null;
};

export function AdminCustomerSwitcher({
  basePath,
  workspaces,
  selectedWorkspaceId,
}: Props) {
  const selectedLabel =
    workspaces.find((workspace) => workspace.id === selectedWorkspaceId)?.label ??
    "All customers";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#F5B942]">
            Customer Filter
          </p>
          <p className="mt-1 text-sm text-white/70">
            Currently viewing: {selectedLabel}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={basePath}
            className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
              !selectedWorkspaceId
                ? "bg-white text-gray-900"
                : "border border-white/15 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]"
            }`}
          >
            All customers
          </Link>

          {workspaces.map((workspace) => (
            <Link
              key={workspace.id}
              href={`${basePath}?workspaceId=${workspace.id}`}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                selectedWorkspaceId === workspace.id
                  ? "bg-white text-gray-900"
                  : "border border-white/15 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]"
              }`}
            >
              {workspace.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}