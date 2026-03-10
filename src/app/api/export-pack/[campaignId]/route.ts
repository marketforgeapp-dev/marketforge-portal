import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { buildCampaignExportPack } from "@/lib/export-pack";

type Props = {
  params: Promise<{
    campaignId: string;
  }>;
};

export async function GET(_request: Request, { params }: Props) {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const appUser = await prisma.user.findUnique({
    where: { clerkUserId },
    include: {
      workspaces: {
        select: {
          workspaceId: true,
        },
      },
    },
  });

  const workspaceIds = appUser?.workspaces.map((item) => item.workspaceId) ?? [];

  if (workspaceIds.length === 0) {
    return new NextResponse("Workspace not found", { status: 404 });
  }

  const { campaignId } = await params;

  const campaign = await prisma.campaign.findFirst({
    where: {
      id: campaignId,
      workspaceId: {
        in: workspaceIds,
      },
    },
    include: {
      assets: {
        orderBy: {
          createdAt: "asc",
        },
      },
      workspace: {
        include: {
          businessProfile: true,
        },
      },
    },
  });

  if (!campaign) {
    return new NextResponse("Campaign not found", { status: 404 });
  }

  const { zipBuffer, fileName, exportType } = await buildCampaignExportPack({
    campaign,
    profile: campaign.workspace.businessProfile,
  });

  await prisma.exportLog.create({
    data: {
      workspaceId: campaign.workspaceId,
      campaignId: campaign.id,
      userId: appUser?.id ?? null,
      exportType,
      fileName,
      fileCount: campaign.assets.length,
    },
  });

  return new NextResponse(new Uint8Array(zipBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}