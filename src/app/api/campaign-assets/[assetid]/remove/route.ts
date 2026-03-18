import { prisma } from "@/lib/prisma";

export async function POST(_: Request, { params }: { params: { assetId: string } }) {
  await prisma.campaignAsset.delete({
    where: { id: params.assetId },
  });

  return new Response(JSON.stringify({ success: true }));
}