"use server";

import { revalidatePath } from "next/cache";
import { getCurrentWorkspace } from "@/lib/get-current-workspace";
import { refreshWeeklyWorkspaceSignals } from "@/lib/opportunity-snapshot";

export async function runDashboardWeeklySignalRefresh() {
  const workspace = await getCurrentWorkspace();

  if (!workspace) {
    return {
      success: false,
      reason: "workspace_not_found",
    };
  }

  if (workspace.status !== "ACTIVE") {
    return {
      success: false,
      reason: "workspace_not_active",
      workspaceStatus: workspace.status,
    };
  }

  const result = await refreshWeeklyWorkspaceSignals(workspace.id);

  if (result.snapshotInvalidated) {
    revalidatePath("/dashboard");
    revalidatePath("/opportunities");
  }

  return {
    success: true,
    result,
  };
}