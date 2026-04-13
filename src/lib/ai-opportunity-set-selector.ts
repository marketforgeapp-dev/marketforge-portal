import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { BusinessProfile, Competitor } from "@/generated/prisma";
import type { RankedOpportunity } from "@/lib/revenue-opportunity-engine";
import { openai } from "@/lib/openai";

const candidateBriefSchema = z.object({
  briefs: z.array(
    z.object({
      opportunityKey: z.string().min(1),
      breadth: z.enum(["broad", "medium", "narrow"]),
      demandDependability: z.enum(["high", "medium", "low"]),
      urgencyRealism: z.enum(["high", "medium", "low"]),
      bookingEase: z.enum(["high", "medium", "low"]),
      ownerBelievability: z.enum(["high", "medium", "low"]),
      recommendedRole: z.enum(["hero", "visible", "reserve", "suppress"]),
      rationale: z.string().min(1),
    })
  ),
});

const aiOpportunitySetSchema = z.object({
  heroOpportunityKey: z.string().min(1),
  visibleOpportunityKeys: z.array(z.string().min(1)).min(1).max(6),
  reasoning: z.array(
    z.object({
      opportunityKey: z.string().min(1),
      rationale: z.string().min(1),
    })
  ),
});

export type AiCandidateBrief = z.infer<typeof candidateBriefSchema>["briefs"][number];
export type AiOpportunitySetSelection = z.infer<typeof aiOpportunitySetSchema>;

function summarizeCompetitors(competitors: Competitor[]): string {
  if (competitors.length === 0) {
    return "Competitor data is limited.";
  }

  const reviewLeaders = competitors
    .filter(
      (competitor) =>
        typeof competitor.rating === "number" &&
        typeof competitor.reviewCount === "number"
    )
    .sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0))
    .slice(0, 3)
    .map((competitor) => {
      const rating =
        typeof competitor.rating === "number"
          ? competitor.rating.toFixed(1)
          : "unknown";
      const reviewCount =
        typeof competitor.reviewCount === "number"
          ? competitor.reviewCount.toLocaleString()
          : "unknown";

      return `${competitor.name}: ${rating} stars, ${reviewCount} reviews`;
    });

  if (reviewLeaders.length === 0) {
    return `Competitor set size: ${competitors.length}. Review and rating data is limited.`;
  }

  return `Competitor set size: ${competitors.length}. Review leaders: ${reviewLeaders.join(
    " | "
  )}`;
}

function buildCandidatePayload(candidate: RankedOpportunity) {
  return {
    opportunityKey: candidate.opportunityKey,
    familyKey: candidate.familyKey,
    title: candidate.title,
    serviceName: candidate.serviceName,
    opportunityType: candidate.opportunityType,
    bestMove: candidate.bestMove,
    displayMoveLabel: candidate.displayMoveLabel,
    displaySummary: candidate.displaySummary,
    recommendedCampaignType: candidate.recommendedCampaignType,
    whyNowBullets: candidate.whyNowBullets,
    whyThisMatters: candidate.whyThisMatters,
    confidenceScore: candidate.confidenceScore,
    confidenceLabel: candidate.confidenceLabel,
    capacityFit: candidate.capacityFit,
    sourceTags: candidate.sourceTags,
    performanceLabel: candidate.performanceLabel,
    performanceDetail: candidate.performanceDetail,
    historicalCampaignCount: candidate.historicalCampaignCount,
    seasonalityRelevance: candidate.seasonalityRelevance,
    seasonalityReason: candidate.seasonalityReason,
    urgencyRelevance: candidate.urgencyRelevance,
    urgencyReason: candidate.urgencyReason,
    homeownerIntentStrength: candidate.homeownerIntentStrength,
    homeownerIntentReason: candidate.homeownerIntentReason,
    actionFraming: candidate.actionFraming,
    actionFramingReason: candidate.actionFramingReason,
    finalSurface: candidate.finalSurface,
    heroEligibleFinal: candidate.heroEligibleFinal,
    contextType: candidate.contextType,
    demandShape: candidate.demandShape,
    decisionRationale: candidate.decisionRationale,
  };
}

async function buildCandidateBriefsWithAI(params: {
  profile: Pick<
    BusinessProfile,
    | "businessName"
    | "industryLabel"
    | "city"
    | "state"
    | "serviceArea"
    | "averageJobValue"
    | "preferredServices"
    | "deprioritizedServices"
    | "highestMarginService"
    | "lowestPriorityService"
    | "weeklyCapacity"
    | "technicians"
    | "googleRating"
    | "googleReviewCount"
    | "hasFaqContent"
    | "hasServicePages"
    | "hasGoogleBusinessPage"
    | "aeoReadinessScore"
  >;
  candidates: RankedOpportunity[];
  competitors: Competitor[];
}): Promise<AiCandidateBrief[]> {
  if (params.candidates.length === 0) {
    return [];
  }

  try {
    const completion = await openai.chat.completions.parse({
      model: process.env.OPENAI_INTELLIGENCE_MODEL ?? "gpt-4.1-mini",
      temperature: 0.1,
      messages: [
                        {
          role: "system",
          content: [
            "You are evaluating already-generated MarketForge opportunities for a local service business.",
            "You are NOT generating new opportunities.",
            "Think like the owner-operator of a local home-service company in the same industry as the business profile.",
            "That means if the business is plumbing, think like a plumbing company owner. If HVAC, think like an HVAC company owner. If septic, think like a septic company owner. If tree service, think like a tree-service company owner.",
            "Also think like a small-business general manager, a local marketing lead, and a business analyst responsible for near-term booked jobs, schedule health, margins, and practical execution.",
            "When visibility work is relevant, also think like a senior AEO/SEO strategist focused on how homeowners find and trust a business online.",
            "Infer practical commercial signals even if they are not explicitly stored in the database.",
            "Use general business judgment about breadth of demand, specialization, booking ease, urgency realism, and whether a real owner-operator in that industry would actually want to run this action now.",
            "Do not overvalue severe, urgent, or safety-critical services just because they sound important.",
            "Broad, dependable, easier-to-book demand is often more believable as an always-on revenue action than narrow, severe, or lower-frequency work.",
            "A strong opportunity is not just high-value or urgent. It is believable, actionable, and commercially sensible in the mix of actions a business would actually run.",
            "Do not invent specific market facts.",
            "Do not assume numeric rank is correct.",
            "Return only structured output.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify(
            {
              businessContext: {
                businessName: params.profile.businessName,
                industryLabel: params.profile.industryLabel,
                city: params.profile.city,
                state: params.profile.state,
                serviceArea: params.profile.serviceArea,
                averageJobValue: params.profile.averageJobValue,
                preferredServices: params.profile.preferredServices,
                deprioritizedServices: params.profile.deprioritizedServices,
                highestMarginService: params.profile.highestMarginService,
                lowestPriorityService: params.profile.lowestPriorityService,
                weeklyCapacity: params.profile.weeklyCapacity,
                technicians: params.profile.technicians,
                googleRating: params.profile.googleRating,
                googleReviewCount: params.profile.googleReviewCount,
                hasFaqContent: params.profile.hasFaqContent,
                hasServicePages: params.profile.hasServicePages,
                hasGoogleBusinessPage: params.profile.hasGoogleBusinessPage,
                aeoReadinessScore: params.profile.aeoReadinessScore,
              },
              competitorSummary: summarizeCompetitors(params.competitors),
              instructions: [
                "For each candidate, infer whether it is broad or narrow demand.",
                "Infer how dependable the demand is for near-term revenue generation.",
                "Infer whether the urgency framing is truly believable.",
                "Infer whether the action is easier to book or more specialized and lower-frequency.",
                "Infer whether a real owner-operator would see this as believable to run now.",
                "Recommend a role: hero, visible, reserve, or suppress.",
              ],
              candidates: params.candidates.map(buildCandidatePayload),
            },
            null,
            2
          ),
        },
      ],
      response_format: zodResponseFormat(
        candidateBriefSchema,
        "marketforge_candidate_briefs"
      ),
    });

    return completion.choices[0]?.message.parsed?.briefs ?? [];
  } catch (error) {
    console.error("[ai-opportunity-set-selector] candidate briefing failed", error);
    return [];
  }
}

export async function selectOpportunitySetWithAI(params: {
  profile: Pick<
    BusinessProfile,
    | "businessName"
    | "industryLabel"
    | "city"
    | "state"
    | "serviceArea"
    | "averageJobValue"
    | "preferredServices"
    | "deprioritizedServices"
    | "highestMarginService"
    | "lowestPriorityService"
    | "weeklyCapacity"
    | "technicians"
    | "googleRating"
    | "googleReviewCount"
    | "hasFaqContent"
    | "hasServicePages"
    | "hasGoogleBusinessPage"
    | "aeoReadinessScore"
  >;
  candidates: RankedOpportunity[];
  competitors: Competitor[];
  targetVisibleCount?: number;
}): Promise<AiOpportunitySetSelection | null> {
  const visibleCount = params.targetVisibleCount ?? 6;

  if (params.candidates.length === 0) {
    return null;
  }

  try {
    const briefs = await buildCandidateBriefsWithAI({
      profile: params.profile,
      candidates: params.candidates,
      competitors: params.competitors,
    });

    const completion = await openai.chat.completions.parse({
      model: process.env.OPENAI_INTELLIGENCE_MODEL ?? "gpt-4.1-mini",
      temperature: 0.1,
      messages: [
                        {
          role: "system",
          content: [
            "You are selecting the best visible MarketForge opportunity set for a local service business.",
            "You are NOT generating new opportunities.",
            "You are choosing from a pre-approved candidate pool that has already passed deterministic eligibility checks.",
            "Think like the owner-operator of a company in the same industry as the business profile.",
            "That means if the business is plumbing, think like a plumbing company owner deciding what actions to actually run next. If HVAC, think like an HVAC company owner. If septic, think like a septic company owner. If tree service, think like a tree-service company owner.",
            "Also think like a small-business general manager, a local growth strategist, and a business analyst responsible for near-term booked jobs, schedule health, margins, and practical execution.",
            "When visibility work is relevant, also think like a senior AEO/SEO strategist focused on how homeowners find and trust a business online.",
            "Your job is to choose 1 hero opportunity and a total visible set of 6 opportunities that feel commercially believable, complementary, and revenue-oriented right now.",
            "Do not treat numeric ranking as the source of truth.",
            "Choose based on what a real owner-operator in that industry would actually want to run next, not what sounds most strategically impressive or severe.",
            "A good visible set should include believable breadth across dependable demand, selective urgency, some higher-value upside, and strategic visibility only when justified.",
            "A bad visible set is one that feels overly concentrated in emergencies, severe failures, highly specialized installs, or lower-frequency problem lanes.",
            "Do not overvalue severe, urgent, or safety-critical services just because they sound important.",
            "Prefer broader, more dependable, easier-to-book demand when credible options are available.",
            "Use narrower high-value or high-consequence services selectively, only when they strengthen the set rather than dominate it.",
            "A real owner-operator in that industry should look at the set and think: yes, this is the mix I would actually run.",
            "Return only structured output.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify(
            {
              targetVisibleCount: visibleCount,
              businessContext: {
                businessName: params.profile.businessName,
                industryLabel: params.profile.industryLabel,
                city: params.profile.city,
                state: params.profile.state,
                serviceArea: params.profile.serviceArea,
                averageJobValue: params.profile.averageJobValue,
                preferredServices: params.profile.preferredServices,
                deprioritizedServices: params.profile.deprioritizedServices,
                highestMarginService: params.profile.highestMarginService,
                lowestPriorityService: params.profile.lowestPriorityService,
                weeklyCapacity: params.profile.weeklyCapacity,
                technicians: params.profile.technicians,
                googleRating: params.profile.googleRating,
                googleReviewCount: params.profile.googleReviewCount,
                hasFaqContent: params.profile.hasFaqContent,
                hasServicePages: params.profile.hasServicePages,
                hasGoogleBusinessPage: params.profile.hasGoogleBusinessPage,
                aeoReadinessScore: params.profile.aeoReadinessScore,
              },
              competitorSummary: summarizeCompetitors(params.competitors),
              instructions: [
                "Choose exactly one hero opportunity key.",
                `Choose exactly ${visibleCount} visible opportunity keys if possible, otherwise choose the maximum available.`,
                "The hero opportunity key must also appear in the visible opportunity keys array.",
                "Do not assume the candidates are already in the right order.",
                "Do not use score as the deciding factor.",
                "Choose the set that a real local service business owner would most likely approve and run next.",
                "Prefer including broader, more dependable, easier-to-book demand when credible candidates are available.",
                "Do not let urgent, severe, safety-critical, or specialized services dominate the set unless the evidence is unusually strong.",
                "Use some urgency only when it improves the mix rather than overwhelming it.",
                "Allow narrower high-value opportunities only when they strengthen the set rather than dominate it.",
                "Use visibility work when justified, but do not let it dominate over clearer direct-revenue actions.",
                "A weak set is one that feels narrow, overly reactive, or too concentrated in severe problem lanes.",
                "A strong set is one that feels commercially balanced, believable, and actionable right now.",
              ],
              candidateBriefs: briefs,
              candidates: params.candidates.map(buildCandidatePayload),
            },
            null,
            2
          ),
        },
      ],
      response_format: zodResponseFormat(
        aiOpportunitySetSchema,
        "marketforge_ai_opportunity_set"
      ),
    });

    return completion.choices[0]?.message.parsed ?? null;
  } catch (error) {
    console.error("[ai-opportunity-set-selector] selection failed", error);
    return null;
  }
}