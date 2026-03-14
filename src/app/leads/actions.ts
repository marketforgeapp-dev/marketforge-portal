"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { LeadStatus, Prisma } from "@/generated/prisma";

function revalidateLeadViews() {
  revalidatePath("/leads");
  revalidatePath("/reports");
  revalidatePath("/dashboard");
}

function normalizePhone(phone?: string | null) {
  if (!phone) return null;
  return phone.replace(/\D/g, "").slice(0, 10);
}

export async function createLead(input: {
  workspaceId: string;
  leadName: string;
  phone?: string;
  email?: string;
  source?: string;
  serviceNeeded?: string;
  campaignId?: string | null;
  notes?: string;
}) {
  const leadName = input.leadName.trim();

  if (leadName.length < 2) {
    throw new Error("Lead name is required.");
  }

  const normalizedPhone = normalizePhone(input.phone);
  const serviceNeeded = input.serviceNeeded?.trim();
  const notes = input.notes?.trim();

  const mergedNotes = [
    serviceNeeded ? `Service needed: ${serviceNeeded}` : null,
    notes || null,
  ]
    .filter(Boolean)
    .join("\n\n")
    .trim();

  if (normalizedPhone) {
    const existingLeads = await prisma.lead.findMany({
      where: {
        workspaceId: input.workspaceId,
      },
      select: {
        id: true,
        phone: true,
        notes: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    const existingLead = existingLeads.find((lead) => {
      const existingNormalized = normalizePhone(lead.phone);
      return existingNormalized === normalizedPhone;
    });

    if (existingLead) {
      const updatedNotes = [existingLead.notes, mergedNotes]
        .filter(Boolean)
        .join("\n\n")
        .trim();

      await prisma.lead.update({
        where: { id: existingLead.id },
        data: {
          notes: updatedNotes || existingLead.notes,
          email: input.email?.trim() || undefined,
          source: input.source?.trim() || undefined,
          campaignId: input.campaignId ?? undefined,
        },
      });

      revalidateLeadViews();
      return {
        created: false,
        deduped: true,
        leadId: existingLead.id,
      };
    }
  }

  const createdLead = await prisma.lead.create({
    data: {
      workspaceId: input.workspaceId,
      leadName,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      source: input.source?.trim() || "Phone Call",
      notes: mergedNotes || null,
      status: "NEW",
      campaignId: input.campaignId ?? null,
    },
  });

  revalidateLeadViews();

  return {
    created: true,
    deduped: false,
    leadId: createdLead.id,
  };
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
      bookedAt: status === "BOOKED" ? currentLead.bookedAt ?? new Date() : null,
      bookedRevenue: status === "BOOKED" ? currentLead.bookedRevenue : null,
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