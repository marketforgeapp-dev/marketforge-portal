import { redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/get-current-workspace";
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
    <div className="mf-page-shell min-h-screen px-4 py-5 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5 lg:flex-row">
        <DashboardSidebar />

        <main className="min-w-0 flex-1 space-y-5">
          <section className="mf-dark-panel mf-grid-glow rounded-3xl px-5 py-5 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#F5B942]">
              AEO
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white md:text-3xl">
              AI search readiness
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">
              Evaluate how well your business is positioned for AI-assisted local
              search, answer engines, and structured question-based discovery.
            </p>
          </section>

          <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
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