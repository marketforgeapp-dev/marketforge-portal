"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { LeadStatus } from "@/generated/prisma";

export async function updateLeadStatus(leadId: string, status: LeadStatus) {
  await prisma.lead.update({
    where: { id: leadId },
    data: { status },
  });

  revalidatePath("/leads");
  revalidatePath("/reports");
}