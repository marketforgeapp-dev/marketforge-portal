import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { AeoRecommendations } from "@/components/aeo/aeo-recommendations";
import { AeoScoreCard } from "@/components/aeo/aeo-score-card";
import { AeoSignalList } from "@/components/aeo/aeo-signal-list";
import { getCurrentWorkspace } from "@/lib/get-current-workspace";
import { prisma } from "@/lib/prisma";
import { parseWebsiteIntelligenceAssessment } from "@/lib/website-intelligence";
import { buildWebsiteIntelligenceRecommendations } from "@/lib/website-intelligence-recommendations";

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

  const websiteIntelligence = parseWebsiteIntelligenceAssessment(
    profile.websiteIntelligenceJson
  );

  const recommendations = websiteIntelligence
    ? buildWebsiteIntelligenceRecommendations(websiteIntelligence)
    : [];

  return (
    <div className="mf-page-shell min-h-screen px-4 py-5 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5 lg:flex-row">
        <DashboardSidebar />

        <main className="min-w-0 flex-1 space-y-5">
          <DashboardHeader
            workspaceName={profile.businessName ?? workspace.name}
            logoUrl={profile.logoUrl ?? null}
          />

          <section className="mf-dark-panel mf-grid-glow rounded-3xl px-5 py-5 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#F5B942]">
              AEO
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white md:text-3xl">
              Website Intelligence
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">
              MarketForge reviews how clearly your website communicates your
              services, expertise, local relevance, and credibility — then
              identifies the highest-priority improvements to strengthen
              discoverability and customer trust.
            </p>
          </section>

          {!websiteIntelligence ? (
            <section className="mf-card rounded-3xl p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                Website Intelligence
              </p>

              <h2 className="mt-2 text-xl font-bold text-gray-900">
                Your website assessment is not available yet
              </h2>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
                MarketForge has not established a complete Website Intelligence
                assessment for this workspace yet. The live website will be
                reviewed during an upcoming intelligence refresh.
              </p>
            </section>
          ) : (
            <>
              <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
                <AeoScoreCard assessment={websiteIntelligence} />
                <AeoSignalList assessment={websiteIntelligence} />
              </div>

              <AeoRecommendations recommendations={recommendations} />
            </>
          )}
        </main>
      </div>
    </div>
  );
}