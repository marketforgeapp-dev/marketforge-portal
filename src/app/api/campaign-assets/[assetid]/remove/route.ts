import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _: NextRequest,
  context: { params: Promise<{ assetid: string }> }
) {
  const { assetid } = await context.params;

  await prisma.campaignAsset.delete({
    where: { id: assetid },
  });

  return Response.json({ success: true });
}