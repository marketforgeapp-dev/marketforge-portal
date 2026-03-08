import { redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/get-current-workspace";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";

export default async function SettingsPage() {
  const workspace = await getCurrentWorkspace();

  if (!workspace || !workspace.onboardingCompletedAt) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row">
        <DashboardSidebar />

        <main className="flex-1">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              Settings
            </p>
            <h1 className="mt-2 text-3xl font-bold text-gray-900">
              Workspace Settings
            </h1>
            <p className="mt-2 text-gray-600">
              This page is a placeholder for now. Workspace and profile settings will live here.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}