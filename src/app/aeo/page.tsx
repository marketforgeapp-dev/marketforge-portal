import { redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/get-current-workspace";
import { seedDemoWorkspaceData } from "@/lib/seed-demo-workspace-data";
import { prisma } from "@/lib/prisma";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { AeoScoreCard } from "@/components/aeo/aeo-score-card";
import { AeoRecommendations } from "@/components/aeo/aeo-recommendations";
import { AeoSignalList } from "@/components/aeo/aeo-signal-list";

export default async function AeoPage() {
  const workspace = await getCurrentWorkspace();

  if (!workspace || !workspace.onboardingCompletedAt) {
    redirect("/onboarding");
  }

  await seedDemoWorkspaceData(workspace.id);

  const profile = await prisma.businessProfile.findUnique({
    where: { workspaceId: workspace.id },
  });

  if (!profile) {
    redirect("/dashboard");
  }

  const recommendations = [
    "Add structured FAQ content for high-intent plumbing questions.",
    "Expand service pages with answer-ready local service copy.",
    "Publish more local educational content tied to plumbing problems.",
    "Improve entity clarity across core service and location pages.",
    "Create answer snippets for drain, water heater, and emergency queries.",
  ];

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row">
        <DashboardSidebar />

        <main className="flex-1 space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              AEO
            </p>

            <h1 className="mt-2 text-3xl font-bold text-gray-900">
              AI Search Readiness
            </h1>

            <p className="mt-2 text-gray-600">
              Evaluate how well your business is positioned for AI-assisted local
              search, answer engines, and structured question-based discovery.
            </p>
          </div>

          <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <AeoScoreCard score={profile.aeoReadinessScore ?? 0} />

            <AeoSignalList
              hasServicePages={profile.hasServicePages}
              hasFaqContent={profile.hasFaqContent}
              hasBlog={profile.hasBlog}
              hasGoogleBusinessPage={profile.hasGoogleBusinessPage}
              servicePageCount={profile.servicePageUrls.length}
            />
          </div>

          <AeoRecommendations recommendations={recommendations} />
        </main>
      </div>
    </div>
  );
}