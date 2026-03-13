import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function getCurrentWorkspace() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId },
    include: {
      workspaces: {
        include: {
          workspace: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!user || user.workspaces.length === 0) {
    return null;
  }

  const completedWorkspaceMembership = user.workspaces.find(
    (membership) => membership.workspace.onboardingCompletedAt
  );

  if (completedWorkspaceMembership) {
    return completedWorkspaceMembership.workspace;
  }

  return user.workspaces[0].workspace;
}