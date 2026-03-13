import OpenAI from "openai";
import { z } from "zod";
import { BusinessProfile } from "@/generated/prisma";

export const inferredSignalLevelSchema = z.enum(["LOW", "MEDIUM", "HIGH"]);

export const actionFramingSchema = z.enum([
  "PAID_CAMPAIGN",
  "AEO_CONTENT",
  "LOCAL_VISIBILITY",
  "SCHEDULE_FILL",
  "REPUTATION",
  "PROMOTION",
  "MIXED",
]);

export type InferredSignalLevel = z.infer<typeof inferredSignalLevelSchema>;
export type ActionFraming = z.infer<typeof actionFramingSchema>;

export const opportunitySignalEnrichmentSchema = z.object({
  serviceName: z.string().min(1),
  seasonalityRelevance: inferredSignalLevelSchema,
  seasonalityReason: z.string().min(1),
  urgencyRelevance: inferredSignalLevelSchema,
  urgencyReason: z.string().min(1),
  homeownerIntentStrength: inferredSignalLevelSchema,
  homeownerIntentReason: z.string().min(1),
  actionFraming: actionFramingSchema,
  actionFramingReason: z.string().min(1),
});

const enrichmentResponseSchema = z.object({
  opportunities: z.array(opportunitySignalEnrichmentSchema),
});

export type OpportunitySignalEnrichment = z.infer<
  typeof opportunitySignalEnrichmentSchema
>;

const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const enrichmentJsonSchema = {
  name: "opportunity_signal_enrichment",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      opportunities: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            serviceName: { type: "string" },
            seasonalityRelevance: {
              type: "string",
              enum: ["LOW", "MEDIUM", "HIGH"],
            },
            seasonalityReason: { type: "string" },
            urgencyRelevance: {
              type: "string",
              enum: ["LOW", "MEDIUM", "HIGH"],
            },
            urgencyReason: { type: "string" },
            homeownerIntentStrength: {
              type: "string",
              enum: ["LOW", "MEDIUM", "HIGH"],
            },
            homeownerIntentReason: { type: "string" },
            actionFraming: {
              type: "string",
              enum: [
                "PAID_CAMPAIGN",
                "AEO_CONTENT",
                "LOCAL_VISIBILITY",
                "SCHEDULE_FILL",
                "REPUTATION",
                "PROMOTION",
                "MIXED",
              ],
            },
            actionFramingReason: { type: "string" },
          },
          required: [
            "serviceName",
            "seasonalityRelevance",
            "seasonalityReason",
            "urgencyRelevance",
            "urgencyReason",
            "homeownerIntentStrength",
            "homeownerIntentReason",
            "actionFraming",
            "actionFramingReason",
          ],
        },
      },
    },
    required: ["opportunities"],
  },
};

function normalizeServiceName(serviceName: string) {
  return serviceName.trim().toLowerCase();
}

function heuristicFallback(serviceName: string): OpportunitySignalEnrichment {
  const normalized = normalizeServiceName(serviceName);

  if (normalized.includes("ai search visibility")) {
    return {
      serviceName,
      seasonalityRelevance: "LOW",
      seasonalityReason:
        "Answer-engine visibility work is not strongly seasonal and can be valuable year-round.",
      urgencyRelevance: "MEDIUM",
      urgencyReason:
        "Visibility gaps are not emergency issues, but delaying them slows future demand capture.",
      homeownerIntentStrength: "MEDIUM",
      homeownerIntentReason:
        "This work supports future discovery and trust rather than immediate same-day booking.",
      actionFraming: "AEO_CONTENT",
      actionFramingReason:
        "This is best handled through FAQ and service-page improvement rather than a direct paid push.",
    };
  }

  if (normalized.includes("emergency")) {
    return {
      serviceName,
      seasonalityRelevance: "MEDIUM",
      seasonalityReason:
        "Emergency service demand is not strictly seasonal, but it can spike during stress events and urgent failures.",
      urgencyRelevance: "HIGH",
      urgencyReason:
        "Customers usually need immediate help when this service is needed.",
      homeownerIntentStrength: "HIGH",
      homeownerIntentReason:
        "Emergency intent is often close to immediate booking behavior.",
      actionFraming: "PAID_CAMPAIGN",
      actionFramingReason:
        "This kind of service is well suited to direct-response demand capture.",
    };
  }

  if (normalized.includes("drain")) {
    return {
      serviceName,
      seasonalityRelevance: "HIGH",
      seasonalityReason:
        "Drain issues often become more noticeable around seasonal weather and household usage shifts.",
      urgencyRelevance: "HIGH",
      urgencyReason:
        "Drain backups and clogs often feel urgent enough to trigger near-term action.",
      homeownerIntentStrength: "HIGH",
      homeownerIntentReason:
        "When drain problems are visible, homeowners are often close to booking.",
      actionFraming: "PAID_CAMPAIGN",
      actionFramingReason:
        "This service is usually a strong fit for direct-response promotions.",
    };
  }

  if (normalized.includes("water heater")) {
    return {
      serviceName,
      seasonalityRelevance: "MEDIUM",
      seasonalityReason:
        "Water heater issues can rise in colder periods, but failures also happen year-round.",
      urgencyRelevance: "HIGH",
      urgencyReason:
        "Loss of hot water is often disruptive enough to trigger quick homeowner action.",
      homeownerIntentStrength: "HIGH",
      homeownerIntentReason:
        "Water heater replacement needs often carry strong near-booking intent.",
      actionFraming: "PAID_CAMPAIGN",
      actionFramingReason:
        "This service is usually well suited to high-intent paid acquisition or direct promotion.",
    };
  }

  if (normalized.includes("maintenance")) {
    return {
      serviceName,
      seasonalityRelevance: "LOW",
      seasonalityReason:
        "Maintenance demand can happen year-round and is less tied to one season than urgent repair work.",
      urgencyRelevance: "LOW",
      urgencyReason:
        "Maintenance is usually optional and can be positioned around convenience rather than urgency.",
      homeownerIntentStrength: "MEDIUM",
      homeownerIntentReason:
        "Homeowners may be open to maintenance when prompted, but intent is often weaker than emergency repair.",
      actionFraming: "SCHEDULE_FILL",
      actionFramingReason:
        "This is a strong fit for a schedule-fill action when open capacity exists.",
    };
  }

  return {
    serviceName,
    seasonalityRelevance: "MEDIUM",
    seasonalityReason:
      "This service has some timing sensitivity but does not appear strongly seasonal from general service behavior alone.",
    urgencyRelevance: "MEDIUM",
    urgencyReason:
      "This service can matter quickly in some cases, but it is not always an immediate emergency.",
    homeownerIntentStrength: "MEDIUM",
    homeownerIntentReason:
      "Homeowner intent looks commercially relevant, but not as strong as urgent repair categories.",
    actionFraming: "PROMOTION",
    actionFramingReason:
      "A focused promotion or local visibility push is a practical default action framing.",
  };
}

function buildFallbackMap(serviceNames: string[]) {
  const fallbackMap = new Map<string, OpportunitySignalEnrichment>();

  for (const serviceName of serviceNames) {
    fallbackMap.set(normalizeServiceName(serviceName), heuristicFallback(serviceName));
  }

  return fallbackMap;
}

export async function getOpportunitySignalEnrichment(params: {
  profile: Pick<
    BusinessProfile,
    | "businessName"
    | "city"
    | "state"
    | "preferredServices"
    | "deprioritizedServices"
    | "averageJobValue"
    | "highestMarginService"
    | "hasFaqContent"
    | "hasServicePages"
    | "hasGoogleBusinessPage"
    | "aeoReadinessScore"
    | "technicians"
    | "weeklyCapacity"
    | "targetBookedJobsPerWeek"
  >;
  serviceNames: string[];
}): Promise<Map<string, OpportunitySignalEnrichment>> {
  const { profile, serviceNames } = params;

  const normalizedServiceNames = Array.from(
    new Set(serviceNames.map((serviceName) => serviceName.trim()).filter(Boolean))
  );

  const fallbackMap = buildFallbackMap(normalizedServiceNames);

  if (!client || normalizedServiceNames.length === 0) {
    return fallbackMap;
  }

  try {
    const currentMonth = new Intl.DateTimeFormat("en-US", {
      month: "long",
      timeZone: "America/New_York",
    }).format(new Date());

    const response = await client.chat.completions.create({
      model: process.env.OPENAI_INTELLIGENCE_MODEL ?? "gpt-4.1-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are enriching opportunity signals for a local service business revenue engine. You must infer likely seasonality relevance, urgency relevance, homeowner intent strength, and best action framing for each service. Do not claim exact local market facts or fake data. Use the business context and general service-buying behavior. Return only valid JSON matching the schema.",
        },
        {
          role: "user",
          content: JSON.stringify(
            {
              currentMonth,
              businessProfile: {
                businessName: profile.businessName,
                city: profile.city,
                state: profile.state,
                preferredServices: profile.preferredServices,
                deprioritizedServices: profile.deprioritizedServices,
                averageJobValue: profile.averageJobValue,
                highestMarginService: profile.highestMarginService,
                technicians: profile.technicians,
                weeklyCapacity: profile.weeklyCapacity,
                targetBookedJobsPerWeek: profile.targetBookedJobsPerWeek,
                hasFaqContent: profile.hasFaqContent,
                hasServicePages: profile.hasServicePages,
                hasGoogleBusinessPage: profile.hasGoogleBusinessPage,
                aeoReadinessScore: profile.aeoReadinessScore,
              },
              services: normalizedServiceNames,
              instructions: [
                "Infer signals conservatively.",
                "Prefer commercially useful distinctions over generic summaries.",
                "Action framing should reflect the most believable next action for a non-marketing business owner.",
                "Use AEO_CONTENT when the best move is answer-engine/FAQ/service-page visibility work rather than a direct paid action.",
              ],
            },
            null,
            2
          ),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: enrichmentJsonSchema,
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return fallbackMap;
    }

    const parsed = enrichmentResponseSchema.parse(JSON.parse(content));
    const result = buildFallbackMap(normalizedServiceNames);

    for (const enrichment of parsed.opportunities) {
      result.set(
        normalizeServiceName(enrichment.serviceName),
        opportunitySignalEnrichmentSchema.parse(enrichment)
      );
    }

    return result;
  } catch {
    return fallbackMap;
  }
}