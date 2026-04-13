import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { BusinessProfile } from "@/generated/prisma";
import type {
  ActionFraming,
  InferredSignalLevel,
} from "@/lib/opportunity-signal-enrichment";
import { openai } from "@/lib/openai";

export type OpportunitySurfaceDecision =
  | "hero"
  | "surface"
  | "reserve"
  | "suppress";

export type ServiceContextType =
  | "evergreen"
  | "seasonal"
  | "event-driven"
  | "low-frequency-high-value"
  | "emergency"
  | "visibility";

export type ServiceContextProfile = {
  contextType: ServiceContextType;
  requiresEventSignal: boolean;
  lowFrequencyHighValue: boolean;
  visibilityDriven: boolean;
  maxVisiblePerFamily: number;
  heroAllowedByDefault: boolean;
};

export type DeterministicContextEvaluation = {
  contextType: ServiceContextType;
  deterministicAdjustment: number;
  deterministicMultiplier: number;
  heroEligibleDeterministic: boolean;
  preliminarySurface: OpportunitySurfaceDecision;
  deterministicReason: string;
};

export type AiContextFitResult = {
  opportunityKey: string;
  contextFitScore: number;
  recommendedSurface: OpportunitySurfaceDecision;
  heroEligible: boolean;
  confidence: "low" | "medium" | "high";
  decisionRationale: string;
  confidenceNote: string;
};

export type CandidateContextFitInput = {
  opportunityKey: string;
  familyKey: string;
  title: string;
  serviceName: string;
  bestMove: string;
  opportunityType: string;
  actionFraming: ActionFraming;
  variantKind: "primary" | "urgent" | "capacity" | "trust" | "premium" | "visibility";
  rawBaseScore: number;
  seasonalityRelevance: InferredSignalLevel;
  seasonalityReason: string;
  urgencyRelevance: InferredSignalLevel;
  urgencyReason: string;
  homeownerIntentStrength: InferredSignalLevel;
  homeownerIntentReason: string;
  whyNowBullets: string[];
  whyThisMatters: string;
  visibilityGapScore?: number;
  competitorSummary?: string | null;
  contextProfile: ServiceContextProfile;
  deterministicContext: DeterministicContextEvaluation;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function averageSignalScore(level: InferredSignalLevel): number {
  if (level === "HIGH") return 1;
  if (level === "MEDIUM") return 0.5;
  return 0;
}

export function getServiceContextProfile(familyKey: string): ServiceContextProfile {
  const map: Record<string, ServiceContextProfile> = {
    "storm-cleanup": {
      contextType: "event-driven",
      requiresEventSignal: true,
      lowFrequencyHighValue: false,
      visibilityDriven: false,
      maxVisiblePerFamily: 1,
      heroAllowedByDefault: false,
    },
    "burst-pipe-repair": {
      contextType: "emergency",
      requiresEventSignal: false,
      lowFrequencyHighValue: false,
      visibilityDriven: false,
      maxVisiblePerFamily: 1,
      heroAllowedByDefault: true,
    },
    "emergency-plumbing": {
      contextType: "emergency",
      requiresEventSignal: false,
      lowFrequencyHighValue: false,
      visibilityDriven: false,
      maxVisiblePerFamily: 1,
      heroAllowedByDefault: true,
    },
    "emergency-septic": {
      contextType: "emergency",
      requiresEventSignal: false,
      lowFrequencyHighValue: false,
      visibilityDriven: false,
      maxVisiblePerFamily: 1,
      heroAllowedByDefault: true,
    },
    "water-heater-repair-replacement": {
      contextType: "low-frequency-high-value",
      requiresEventSignal: false,
      lowFrequencyHighValue: true,
      visibilityDriven: false,
      maxVisiblePerFamily: 2,
      heroAllowedByDefault: true,
    },
    "tankless-water-heater": {
      contextType: "low-frequency-high-value",
      requiresEventSignal: false,
      lowFrequencyHighValue: true,
      visibilityDriven: false,
      maxVisiblePerFamily: 1,
      heroAllowedByDefault: false,
    },
    "sewer-line": {
      contextType: "low-frequency-high-value",
      requiresEventSignal: false,
      lowFrequencyHighValue: true,
      visibilityDriven: false,
      maxVisiblePerFamily: 1,
      heroAllowedByDefault: false,
    },
    "sewer-line-septic": {
      contextType: "low-frequency-high-value",
      requiresEventSignal: false,
      lowFrequencyHighValue: true,
      visibilityDriven: false,
      maxVisiblePerFamily: 1,
      heroAllowedByDefault: false,
    },
    repiping: {
      contextType: "low-frequency-high-value",
      requiresEventSignal: false,
      lowFrequencyHighValue: true,
      visibilityDriven: false,
      maxVisiblePerFamily: 1,
      heroAllowedByDefault: false,
    },
    "custom-home-plumbing-installation": {
      contextType: "low-frequency-high-value",
      requiresEventSignal: false,
      lowFrequencyHighValue: true,
      visibilityDriven: false,
      maxVisiblePerFamily: 1,
      heroAllowedByDefault: false,
    },
    "system-replacement": {
      contextType: "low-frequency-high-value",
      requiresEventSignal: false,
      lowFrequencyHighValue: true,
      visibilityDriven: false,
      maxVisiblePerFamily: 1,
      heroAllowedByDefault: false,
    },
    "tree-removal": {
      contextType: "low-frequency-high-value",
      requiresEventSignal: false,
      lowFrequencyHighValue: true,
      visibilityDriven: false,
      maxVisiblePerFamily: 1,
      heroAllowedByDefault: true,
    },
    "tree-trimming": {
      contextType: "seasonal",
      requiresEventSignal: false,
      lowFrequencyHighValue: false,
      visibilityDriven: false,
      maxVisiblePerFamily: 2,
      heroAllowedByDefault: true,
    },
    "ac-repair": {
      contextType: "seasonal",
      requiresEventSignal: false,
      lowFrequencyHighValue: false,
      visibilityDriven: false,
      maxVisiblePerFamily: 1,
      heroAllowedByDefault: true,
    },
    "heating-repair": {
      contextType: "seasonal",
      requiresEventSignal: false,
      lowFrequencyHighValue: false,
      visibilityDriven: false,
      maxVisiblePerFamily: 1,
      heroAllowedByDefault: true,
    },
    "hvac-maintenance": {
      contextType: "evergreen",
      requiresEventSignal: false,
      lowFrequencyHighValue: false,
      visibilityDriven: false,
      maxVisiblePerFamily: 1,
      heroAllowedByDefault: true,
    },
    "maintenance": {
      contextType: "evergreen",
      requiresEventSignal: false,
      lowFrequencyHighValue: false,
      visibilityDriven: false,
      maxVisiblePerFamily: 1,
      heroAllowedByDefault: true,
    },
    "septic-maintenance": {
      contextType: "evergreen",
      requiresEventSignal: false,
      lowFrequencyHighValue: false,
      visibilityDriven: false,
      maxVisiblePerFamily: 1,
      heroAllowedByDefault: true,
    },
    "brush-removal": {
      contextType: "evergreen",
      requiresEventSignal: false,
      lowFrequencyHighValue: false,
      visibilityDriven: false,
      maxVisiblePerFamily: 1,
      heroAllowedByDefault: true,
    },
    "ai-search-visibility": {
      contextType: "visibility",
      requiresEventSignal: false,
      lowFrequencyHighValue: false,
      visibilityDriven: true,
      maxVisiblePerFamily: 1,
      heroAllowedByDefault: false,
    },
  };

  return (
    map[familyKey] ?? {
      contextType: "evergreen",
      requiresEventSignal: false,
      lowFrequencyHighValue: false,
      visibilityDriven: false,
      maxVisiblePerFamily: 1,
      heroAllowedByDefault: true,
    }
  );
}

export function evaluateDeterministicContext(params: {
  familyKey: string;
  variantKind: CandidateContextFitInput["variantKind"];
  seasonalityRelevance: InferredSignalLevel;
  urgencyRelevance: InferredSignalLevel;
  homeownerIntentStrength: InferredSignalLevel;
  visibilityGapScore?: number;
  baseScore: number;
  isDeprioritized: boolean;
}): DeterministicContextEvaluation {
  const profile = getServiceContextProfile(params.familyKey);
  let adjustment = 0;
  let multiplier = 1;
  let heroEligibleDeterministic = profile.heroAllowedByDefault;
  let preliminarySurface: OpportunitySurfaceDecision = "surface";
  let deterministicReason = "Candidate passed baseline deterministic context checks.";

  const seasonality = averageSignalScore(params.seasonalityRelevance);
  const urgency = averageSignalScore(params.urgencyRelevance);
  const intent = averageSignalScore(params.homeownerIntentStrength);
  const visibilityGap = params.visibilityGapScore ?? 0;

  if (params.isDeprioritized) {
    return {
      contextType: profile.contextType,
      deterministicAdjustment: -30,
      deterministicMultiplier: 0.7,
      heroEligibleDeterministic: false,
      preliminarySurface: "reserve",
      deterministicReason:
        "This service is deprioritized in the business profile, so it cannot compete normally for top placement.",
    };
  }

  if (profile.contextType === "event-driven") {
    if (urgency < 1 && seasonality < 0.5) {
      return {
        contextType: profile.contextType,
        deterministicAdjustment: -28,
        deterministicMultiplier: 0.7,
        heroEligibleDeterministic: false,
        preliminarySurface: "suppress",
        deterministicReason:
          "This is event-driven work without enough current urgency or timing support.",
      };
    }

    adjustment -= 4;
    heroEligibleDeterministic = urgency >= 1;
    preliminarySurface = urgency >= 1 ? "surface" : "reserve";
    deterministicReason =
      "This is event-driven work, so stronger urgency support is required before it can surface aggressively.";
  }

  if (profile.contextType === "emergency") {
    if (urgency < 0.5 && intent < 0.5) {
      adjustment -= 14;
      heroEligibleDeterministic = false;
      preliminarySurface = "reserve";
      deterministicReason =
        "This is an emergency lane, but the current urgency and intent signals are too weak for hero treatment.";
    } else {
      adjustment += 4;
      deterministicReason =
        "This is an emergency lane with enough urgency support to remain highly competitive.";
    }
  }

  if (profile.contextType === "seasonal") {
    if (seasonality < 0.5 && params.variantKind === "urgent") {
      adjustment -= 10;
      heroEligibleDeterministic = false;
      preliminarySurface = "reserve";
      deterministicReason =
        "This is a seasonally sensitive lane and the current timing support is weak for an urgent push.";
    } else if (seasonality >= 1) {
      adjustment += 6;
      deterministicReason =
        "This service is seasonally aligned right now, which makes it more believable as a near-term action.";
    }
  }

    if (profile.contextType === "low-frequency-high-value") {
    if (urgency < 1 && intent < 1) {
      adjustment -= 22;
      multiplier *= 0.76;
      heroEligibleDeterministic = false;
      preliminarySurface = "reserve";
      deterministicReason =
        "This is a low-frequency, high-value lane without strong enough near-term support, so it should stay behind broader and more dependable demand.";
    } else if (urgency < 1 || intent < 1) {
      adjustment -= 12;
      multiplier *= 0.88;
      heroEligibleDeterministic = false;
      preliminarySurface = "reserve";
      deterministicReason =
        "This is a valid high-value lane, but it does not have enough combined urgency and intent support to compete for top visible placement.";
    } else {
      adjustment -= 4;
      heroEligibleDeterministic = false;
      preliminarySurface = "surface";
      deterministicReason =
        "This is a strong high-value lane, but it still should not crowd out too many broader revenue opportunities.";
    }
  }

    if (profile.contextType === "visibility") {
    if (visibilityGap >= 80) {
      adjustment += 8;
      preliminarySurface = "surface";
      heroEligibleDeterministic = false;
      deterministicReason =
        "The visibility gap is severe enough that AI search visibility belongs in the visible set, but it still should not default to hero over direct revenue lanes.";
    } else if (visibilityGap >= 60) {
      adjustment += 3;
      preliminarySurface = "surface";
      heroEligibleDeterministic = false;
      deterministicReason =
        "The visibility gap is real, so AI search visibility should remain a visible strategic option.";
    } else {
      adjustment -= 12;
      preliminarySurface = "reserve";
      heroEligibleDeterministic = false;
      deterministicReason =
        "The visibility gap is not severe enough to compete aggressively for visible placement.";
    }
  }

  if (params.variantKind === "premium" && profile.lowFrequencyHighValue) {
    adjustment -= 6;
  }

  if (params.variantKind === "capacity" && intent >= 0.5) {
    adjustment += 4;
  }

  if (params.variantKind === "trust" && urgency >= 1) {
    adjustment -= 5;
  }

  const deterministicAdjustedScore = clamp(
    (params.baseScore + adjustment) * multiplier,
    1,
    100
  );

  if (deterministicAdjustedScore < 45 && preliminarySurface === "surface") {
    preliminarySurface = "reserve";
  }

  return {
    contextType: profile.contextType,
    deterministicAdjustment: adjustment,
    deterministicMultiplier: multiplier,
    heroEligibleDeterministic,
    preliminarySurface,
    deterministicReason,
  };
}

const aiResultSchema = z.object({
  evaluations: z.array(
    z.object({
      opportunityKey: z.string().min(1),
      contextFitScore: z.number().min(0).max(100),
      recommendedSurface: z.enum(["hero", "surface", "reserve", "suppress"]),
      heroEligible: z.boolean(),
      confidence: z.enum(["low", "medium", "high"]),
      decisionRationale: z.string().min(1),
      confidenceNote: z.string().min(1),
    })
  ),
});

export async function getAiContextFitBatch(params: {
  profile: Pick<
    BusinessProfile,
    | "businessName"
    | "city"
    | "state"
    | "serviceArea"
    | "averageJobValue"
    | "preferredServices"
    | "deprioritizedServices"
    | "weeklyCapacity"
    | "hasFaqContent"
    | "hasBlog"
    | "hasServicePages"
    | "hasGoogleBusinessPage"
    | "aeoReadinessScore"
    | "googleRating"
    | "googleReviewCount"
  >;
  candidates: CandidateContextFitInput[];
}): Promise<Map<string, AiContextFitResult>> {
  const result = new Map<string, AiContextFitResult>();

  if (params.candidates.length === 0) {
    return result;
  }

  try {
    const completion = await openai.chat.completions.parse({
      model: process.env.OPENAI_INTELLIGENCE_MODEL ?? "gpt-4.1-mini",
      temperature: 0.1,
      messages: [
        {
          role: "system",
                    content: [
            "You evaluate already-generated MarketForge revenue opportunities.",
            "You do not invent new recommendations.",
            "Favor believable near-term revenue opportunity over theoretical ticket size.",
            "A good visible set should include a mix of dependable demand, selective urgency, and only limited narrow high-ticket lanes.",
            "Do not allow multiple narrow high-consequence service lanes to dominate the visible opportunity set unless the evidence is unusually strong.",
            "Event-driven and low-frequency high-value services require stronger support.",
            "AI search visibility can be strong, but should not dominate the set unless the gap is severe.",
            "Use hero only when the recommendation would feel obvious and commercially believable to a real owner-operator right now.",
            "Return only structured output.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify(
            {
              businessProfile: params.profile,
              instructions: [
                "Score contextual realism for each candidate.",
                "Use hero only when a real operator would believe this is the best next move right now.",
                "Use surface for visible but not primary options.",
                "Use reserve for valid but lower-priority options.",
                "Use suppress for weak or commercially unrealistic options.",
                "Do not override hard deterministic invalidity.",
              ],
              candidates: params.candidates,
            },
            null,
            2
          ),
        },
      ],
      response_format: zodResponseFormat(aiResultSchema, "marketforge_context_fit"),
    });

    const parsed = completion.choices[0]?.message?.parsed;

    if (!parsed) {
      return result;
    }

    for (const item of parsed.evaluations) {
      result.set(item.opportunityKey, item);
    }

    return result;
  } catch {
    return result;
  }
}