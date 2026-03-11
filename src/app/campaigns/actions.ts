"use server";

import { auth } from "@clerk/nextjs/server";
import { zodResponseFormat } from "openai/helpers/zod";
import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";
import { nlCampaignSchema } from "@/lib/nl-campaign-schema";
import { seedDemoWorkspaceData } from "@/lib/seed-demo-workspace-data";

type CreateCampaignResult =
  | { success: true; campaignId: string; campaignName: string }
  | { success: false; error: string };

function midpoint(low?: number | null, high?: number | null) {
  if (low == null && high == null) return null;
  if (low != null && high == null) return low;
  if (low == null && high != null) return high;
  return Math.round(((low ?? 0) + (high ?? 0)) / 2);
}

function formatFaq(faq: Array<{ question: string; answer: string }>): string {
  return faq.map((item) => `Q: ${item.question}\nA: ${item.answer}`).join("\n\n");
}

function formatGoogleAds(googleAds: {
  headlines: string[];
  descriptions: string[];
}) {
  const headlines = googleAds.headlines.map((h) => `- ${h}`).join("\n");
  const descriptions = googleAds.descriptions.map((d) => `- ${d}`).join("\n");

  return `Headlines:\n${headlines}\n\nDescriptions:\n${descriptions}`;
}

function formatYelp(yelp: {
  headline: string;
  body: string;
  offer: string | null;
  cta: string | null;
}) {
  return [
    `Headline: ${yelp.headline}`,
    "",
    "Body:",
    yelp.body,
    "",
    `Offer: ${yelp.offer ?? "Not provided"}`,
    `CTA: ${yelp.cta ?? "Call now or book online"}`,
  ].join("\n");
}

export async function createCampaignFromPrompt(
  prompt: string
): Promise<CreateCampaignResult> {
  const cleanedPrompt = prompt.trim();

  if (cleanedPrompt.length < 10) {
    return {
      success: false,
      error: "Please enter a more specific campaign request.",
    };
  }

  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return {
      success: false,
      error: "You must be signed in.",
    };
  }

  const appUser = await prisma.user.findUnique({
    where: { clerkUserId },
    include: {
      workspaces: {
        include: {
          workspace: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  const workspace = appUser?.workspaces[0]?.workspace;

  if (!workspace || !workspace.onboardingCompletedAt) {
    return {
      success: false,
      error: "Complete onboarding before creating campaigns.",
    };
  }

  await seedDemoWorkspaceData(workspace.id);

  const profile = await prisma.businessProfile.findUnique({
    where: { workspaceId: workspace.id },
  });

  if (!profile) {
    return {
      success: false,
      error: "Business profile not found.",
    };
  }

  const opportunities = await prisma.revenueOpportunity.findMany({
    where: {
      workspaceId: workspace.id,
      isActive: true,
    },
    orderBy: {
      priorityScore: "desc",
    },
  });

  const recommendations = await prisma.recommendation.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { score: "desc" },
  });

  const opportunitySummary = opportunities
    .map((item) => {
      const revenueLow = item.estimatedRevenueMin
        ? Number(item.estimatedRevenueMin)
        : null;
      const revenueHigh = item.estimatedRevenueMax
        ? Number(item.estimatedRevenueMax)
        : null;

      return [
        `Title: ${item.title}`,
        `Type: ${item.opportunityType}`,
        `Why Now: ${item.whyNow.join(" | ")}`,
        `Jobs: ${item.estimatedBookedJobsMin ?? "?"}-${item.estimatedBookedJobsMax ?? "?"}`,
        `Revenue: ${revenueLow ?? "?"}-${revenueHigh ?? "?"}`,
        `Campaign Type: ${item.recommendedCampaignType ?? "CUSTOM"}`,
      ].join("\n");
    })
    .join("\n\n---\n\n");

  const recommendationSummary = recommendations
    .map((item) => {
      const revenueLow = item.estimatedRevenueMin
        ? Number(item.estimatedRevenueMin)
        : null;
      const revenueHigh = item.estimatedRevenueMax
        ? Number(item.estimatedRevenueMax)
        : null;

      return [
        `Title: ${item.title}`,
        `Campaign Type: ${item.campaignType}`,
        `Score: ${item.score}`,
        `Why Now: ${item.whyNow.join(" | ")}`,
        `Revenue: ${revenueLow ?? "?"}-${revenueHigh ?? "?"}`,
      ].join("\n");
    })
    .join("\n\n---\n\n");

  const systemPrompt = `
You are the MarketForge campaign planner for local home-service businesses.

Your job is to:
1. Parse the user's request.
2. Check whether it aligns with existing active revenue opportunities.
3. Generate a launch-ready campaign draft.
4. Generate realistic channel assets.

Critical rules:
- Do not bypass the opportunity layer.
- If the request aligns with a strong opportunity, reinforce it.
- If it does not align strongly, still generate the campaign, but lower confidence.
- Output only content suitable for a small plumbing business in a local market.
- Keep the language trustworthy, local, direct, and practical.
- Never sound like a generic marketing agency.
- Avoid hype and exaggerated claims.
- Respect this brand tone: ${profile.brandTone ?? "PROFESSIONAL"}.
- Preferred services: ${profile.preferredServices.join(", ")}.
- Deprioritized services: ${profile.deprioritizedServices.join(", ")}.
- Service area: ${profile.serviceArea}.
- Average job value: ${profile.averageJobValue ? Number(profile.averageJobValue) : "unknown"}.
- AEO readiness score: ${profile.aeoReadinessScore ?? "unknown"}.

Generate channel assets for:
- Google Business Profile
- Meta / Facebook / Instagram
- Google Ads
- Yelp
- Email
- Blog
- AEO FAQ
- Answer Snippet

For Yelp, create practical local-service copy that fits a Yelp business ad / promoted listing style:
- one headline
- one body block
- one offer
- one CTA
`;

  const userPrompt = `
Business:
${profile.businessName}
Website: ${profile.website ?? "unknown"}
Phone: ${profile.phone ?? "unknown"}
Service area: ${profile.serviceArea}

User request:
${cleanedPrompt}

Active opportunities:
${opportunitySummary}

Active recommendations:
${recommendationSummary}

Return a single structured campaign object.
`;

  const completion = await openai.chat.completions.parse({
    model: "gpt-4o-2024-08-06",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: zodResponseFormat(
      nlCampaignSchema,
      "marketforge_nl_campaign"
    ),
  });

  const parsed = completion.choices[0]?.message.parsed;

  if (!parsed) {
    return {
      success: false,
      error: "The AI response could not be parsed into a campaign draft.",
    };
  }

  const matchedOpportunity =
    parsed.opportunityCheck.matchedOpportunityTitle == null
      ? null
      : opportunities.find(
          (item) =>
            item.title.toLowerCase() ===
            parsed.opportunityCheck.matchedOpportunityTitle!.toLowerCase()
        ) ?? null;

  const matchedRecommendation =
    parsed.opportunityCheck.matchedRecommendationTitle == null
      ? null
      : recommendations.find(
          (item) =>
            item.title.toLowerCase() ===
            parsed.opportunityCheck.matchedRecommendationTitle!.toLowerCase()
        ) ?? null;

  const estimatedRevenue = midpoint(
    matchedOpportunity
      ? Number(matchedOpportunity.estimatedRevenueMin ?? 0)
      : matchedRecommendation
        ? Number(matchedRecommendation.estimatedRevenueMin ?? 0)
        : null,
    matchedOpportunity
      ? Number(matchedOpportunity.estimatedRevenueMax ?? 0)
      : matchedRecommendation
        ? Number(matchedRecommendation.estimatedRevenueMax ?? 0)
        : null
  );

  const estimatedBookedJobs = midpoint(
    matchedOpportunity?.estimatedBookedJobsMin ??
      matchedRecommendation?.estimatedBookedJobsMin ??
      null,
    matchedOpportunity?.estimatedBookedJobsMax ??
      matchedRecommendation?.estimatedBookedJobsMax ??
      null
  );

  const estimatedLeads = midpoint(
    matchedRecommendation?.estimatedLeadsMin ?? null,
    matchedRecommendation?.estimatedLeadsMax ?? null
  );

  const campaign = await prisma.campaign.create({
    data: {
      workspaceId: workspace.id,
      recommendationId: matchedRecommendation?.id ?? null,
      revenueOpportunityId: matchedOpportunity?.id ?? null,
      name: parsed.campaign.title,
      campaignType: parsed.campaign.campaignType,
      objective: parsed.campaign.objective,
      targetService: parsed.campaign.targetService,
      offer: parsed.campaign.offer,
      audience: parsed.campaign.audience,
      serviceArea: profile.serviceArea,
      estimatedLeads,
      estimatedBookedJobs,
      estimatedRevenue,
      status: "READY",
      qualityReviewStatus: "PENDING",
      briefJson: {
        userPrompt: cleanedPrompt,
        parsedIntent: parsed.parsedIntent,
        opportunityCheck: parsed.opportunityCheck,
        campaignDraft: parsed.campaign,
        creativeGuidance: parsed.campaign.creativeGuidance,
        generatedAt: new Date().toISOString(),
      },
    },
  });

  await prisma.campaignAsset.createMany({
    data: [
      {
        campaignId: campaign.id,
        assetType: "GOOGLE_BUSINESS",
        title: "Google Business Post",
        content: parsed.assets.googleBusinessPost,
      },
      {
        campaignId: campaign.id,
        assetType: "META",
        title: "Meta Ad Copy",
        content: parsed.assets.metaAdCopy,
      },
      {
        campaignId: campaign.id,
        assetType: "GOOGLE_ADS",
        title: "Google Ads Copy",
        content: formatGoogleAds(parsed.assets.googleAds),
      },
      {
        campaignId: campaign.id,
        assetType: "YELP",
        title: "Yelp Ad Copy",
        content: formatYelp(parsed.assets.yelpAd),
      },
      {
        campaignId: campaign.id,
        assetType: "EMAIL",
        title: parsed.assets.emailCampaign.subjectLine,
        content: parsed.assets.emailCampaign.body,
      },
      {
        campaignId: campaign.id,
        assetType: "BLOG",
        title: "Blog Outline",
        content: parsed.assets.blogOutline,
      },
      {
        campaignId: campaign.id,
        assetType: "AEO_FAQ",
        title: "AEO FAQ",
        content: formatFaq(parsed.assets.aeoFaq),
      },
      {
        campaignId: campaign.id,
        assetType: "ANSWER_SNIPPET",
        title: "Answer Snippet",
        content: parsed.assets.answerSnippet,
      },
    ],
  });

  return {
    success: true,
    campaignId: campaign.id,
    campaignName: campaign.name,
  };
}