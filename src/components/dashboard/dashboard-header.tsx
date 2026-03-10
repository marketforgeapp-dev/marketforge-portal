type DashboardHeaderProps = {
  workspaceName: string;
};

export function DashboardHeader({ workspaceName }: DashboardHeaderProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
              Live Workspace
            </span>
            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-green-700">
              Demo Ready
            </span>
          </div>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900">
            {workspaceName}
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            Revenue intelligence, campaign guidance, and managed launch workflow
            for local service businesses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
            Notifications
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
            Profile
          </div>
        </div>
      </div>
    </div>
  );
}