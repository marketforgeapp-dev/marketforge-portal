"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { LeadStatus, Prisma } from "@/generated/prisma";

function revalidateLeadViews() {
  revalidatePath("/leads");
  revalidatePath("/reports");
  revalidatePath("/dashboard");
}

export async function updateLeadStatus(leadId: string, status: LeadStatus) {
  const currentLead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      bookedRevenue: true,
      bookedAt: true,
    },
  });

  if (!currentLead) return;

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      status,
      bookedAt:
        status === "BOOKED"
          ? currentLead.bookedAt ?? new Date()
          : null,
      bookedRevenue:
        status === "BOOKED" ? currentLead.bookedRevenue : null,
    },
  });

  revalidateLeadViews();
}

export async function markLeadBooked(input: {
  leadId: string;
  bookedRevenue: number;
  notes?: string;
}) {
  const { leadId, bookedRevenue, notes } = input;

  if (!Number.isFinite(bookedRevenue) || bookedRevenue <= 0) {
    throw new Error("Booked revenue must be greater than 0.");
  }

  const existingLead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      notes: true,
    },
  });

  if (!existingLead) return;

  const mergedNotes = [existingLead.notes, notes]
    .filter(Boolean)
    .join("\n\n")
    .trim();

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      status: "BOOKED",
      bookedRevenue: new Prisma.Decimal(bookedRevenue.toFixed(2)),
      bookedAt: new Date(),
      notes: mergedNotes || existingLead.notes,
    },
  });

  revalidateLeadViews();
}