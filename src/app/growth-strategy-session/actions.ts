"use server";

import { z } from "zod";

import { sendStrategySessionNotification } from "@/lib/email/send-strategy-session-notification";
import { prisma } from "@/lib/prisma";
import {
  getWebsiteDomain,
  normalizeBusinessName,
  normalizeWebsite,
} from "@/lib/public-site/strategy-session";
import type { StrategySessionFormState } from "@/lib/public-site/strategy-session-types";

const strategySessionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter your name.")
    .max(120, "Name is too long."),

  email: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .max(254, "Email address is too long."),

  phone: z
    .string()
    .trim()
    .max(40, "Phone number is too long.")
    .optional(),

  businessName: z
    .string()
    .trim()
    .min(2, "Enter your business name.")
    .max(180, "Business name is too long."),

  website: z
    .string()
    .trim()
    .min(3, "Enter your business website.")
    .max(500, "Website is too long."),

  availability: z
    .string()
    .trim()
    .max(500, "Availability is too long.")
    .optional(),

  company: z
    .string()
    .trim()
    .max(200)
    .optional(),
});

function optionalValue(value: string | undefined) {
  const trimmed = value?.trim();

  return trimmed && trimmed.length > 0 ? trimmed : null;
}

export async function submitStrategySession(
  _previousState: StrategySessionFormState,
  formData: FormData,
): Promise<StrategySessionFormState> {
  const parsed = strategySessionSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    businessName: formData.get("businessName"),
    website: formData.get("website"),
    availability: formData.get("availability"),
    company: formData.get("company"),
  });

  if (!parsed.success) {
    const flattened = parsed.error.flatten();

    return {
      status: "error",
      message: "Check the highlighted information and try again.",
      fieldErrors: flattened.fieldErrors,
    };
  }

  // Honeypot field.
  // Real visitors never see or complete this input.
  if (parsed.data.company) {
    return {
      status: "success",
      message:
        "You’re set. We’ll prepare before the session and follow up about timing.",
    };
  }

  let website: string;
  let websiteDomain: string;

  try {
    website = normalizeWebsite(parsed.data.website);
    websiteDomain = getWebsiteDomain(parsed.data.website);
  } catch {
    return {
      status: "error",
      message: "Check the highlighted information and try again.",
      fieldErrors: {
        website: ["Enter a valid business website."],
      },
    };
  }

  const email = parsed.data.email.toLowerCase();
  const phone = optionalValue(parsed.data.phone);
  const availability = optionalValue(
    parsed.data.availability,
  );

  try {
    const lead = await prisma.strategySessionLead.create({
      data: {
        name: parsed.data.name,
        email,
        phone,
        businessName: parsed.data.businessName,
        website,
        availability,
        normalizedBusinessName: normalizeBusinessName(
          parsed.data.businessName,
        ),
        websiteDomain,
      },
      select: {
        id: true,
      },
    });

    try {
      await sendStrategySessionNotification({
        name: parsed.data.name,
        email,
        phone,
        businessName: parsed.data.businessName,
        website,
        availability,
        leadId: lead.id,
      });
    } catch (error) {
      console.error(
        "[strategy-session] Lead persisted but notification failed",
        {
          leadId: lead.id,
          error,
        },
      );
    }

    return {
      status: "success",
      message:
        "You’re set. We’ll prepare before the session and follow up about timing.",
    };
  } catch (error) {
    console.error(
      "[strategy-session] Unable to persist lead",
      error,
    );

    return {
      status: "error",
      message:
        "We couldn’t submit your request. Please try again.",
    };
  }
}