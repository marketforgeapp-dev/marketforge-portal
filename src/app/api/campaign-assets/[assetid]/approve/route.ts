import { prisma } from "@/lib/prisma";

export async function POST(_: Request, { params }: { params: { assetId: string } }) {
  await prisma.campaignAsset.update({
    where: { id: params.assetId },
    data: { isApproved: true },
  });

  return new Response(JSON.stringify({ success: true }));
}