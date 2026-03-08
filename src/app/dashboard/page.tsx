import { redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/get-current-workspace";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { prisma } from "@/lib/prisma";
import { seedDemoWorkspaceData } from "@/lib/seed-demo-workspace-data";

export default async function DashboardPage() {
  const workspace = await getCurrentWorkspace();

  if (!workspace) {
    redirect("/onboarding");
  }

  if (!workspace.onboardingCompletedAt) {
    redirect("/onboarding");
  }

  await seedDemoWorkspaceData(workspace.id);

  const opportunities = await prisma.revenueOpportunity.findMany({
    where: {
      workspaceId: workspace.id,
      isActive: true,
    },
    orderBy: {
      priorityScore: "desc",
    },
  });

  const heroOpportunity = opportunities[0];

  return (
    <DashboardShell
      workspaceName={workspace.name}
      opportunity={heroOpportunity}
      opportunities={opportunities}
    />
  );
}