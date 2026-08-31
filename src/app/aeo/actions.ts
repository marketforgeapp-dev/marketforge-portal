"use server";

import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";

import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";
import { parseWebsiteIntelligenceAssessment } from "@/lib/website-intelligence";
import {
  buildWebsiteIntelligenceRecommendations,
  type WebsiteIntelligenceRecommendation,
} from "@/lib/website-intelligence-recommendations";

const authorityArticleSchema = z.object({
  title: z.string().min(1),
  excerpt: z.string().min(1),
  introduction: z.string().min(1),

  sections: z
    .array(
      z.object({
        heading: z.string().min(1),
        body: z.string().min(1),
      })
    )
    .min(3)
    .max(6),

  cta: z.string().min(1),

  seoTitle: z.string().min(1),
  metaDescription: z.string().min(1),
  suggestedSlug: z.string().min(1),

  internalLinkSuggestions: z
    .array(z.string().min(1))
    .min(1)
    .max(6),
});

type AuthorityArticle = z.infer<typeof authorityArticleSchema>;

const websiteImplementationPlanSchema = z.object({
  overview: z.string().min(1),

  developerSummary: z.string().min(1),

  recommendedPages: z
    .array(
      z.object({
        pageName: z.string().min(1),
        purpose: z.string().min(1),
        suggestedPath: z.string().nullable(),

        h1Recommendation: z.string().min(1),

        contentSections: z
          .array(
            z.object({
              heading: z.string().min(1),
              purpose: z.string().min(1),
              contentRequirements: z
                .array(z.string().min(1))
                .min(1)
                .max(8),
            })
          )
          .min(1)
          .max(8),

        seoGuidance: z.object({
          titleGuidance: z.string().min(1),
          metaDescriptionGuidance: z.string().min(1),
        }),
      })
    )
    .min(1)
    .max(8),

  internalLinking: z
    .array(
      z.object({
        from: z.string().min(1),
        to: z.string().min(1),
        reason: z.string().min(1),
      })
    )
    .max(12),

  sitewideChanges: z
    .array(z.string().min(1))
    .max(12),

  implementationChecklist: z
    .array(z.string().min(1))
    .min(1)
    .max(20),

  verificationChecklist: z
    .array(z.string().min(1))
    .min(1)
    .max(12),

  claimGuardrails: z
    .array(z.string().min(1))
    .min(1)
    .max(12),
});

export type WebsiteImplementationPlan = z.infer<
  typeof websiteImplementationPlanSchema
>;

async function getGuidedRecommendation(params: {
  workspaceId: string;
  recommendationId: string;
}) {
  const profile =
    await prisma.businessProfile.findUnique({
      where: {
        workspaceId: params.workspaceId,
      },
    });

  if (!profile) {
    throw new Error("Business profile not found.");
  }

  const assessment =
    parseWebsiteIntelligenceAssessment(
      profile.websiteIntelligenceJson
    );

  if (!assessment) {
    throw new Error(
      "Website Intelligence assessment is not available."
    );
  }

  const recommendation =
    buildWebsiteIntelligenceRecommendations(
      assessment
    ).find(
      (item) =>
        item.id === params.recommendationId
    );

  if (!recommendation) {
    throw new Error(
      "Website Intelligence recommendation could not be found."
    );
  }

  if (
    recommendation.executionType !==
    "GUIDED_IMPLEMENTATION"
  ) {
    throw new Error(
      "This recommendation can be handled directly by MarketForge and does not require an external implementation plan."
    );
  }

  return {
    profile,
    assessment,
    recommendation,
  };
}

async function generateWebsiteImplementationPlan(params: {
  businessName: string;
  website: string | null;
  serviceArea: string;
  preferredServices: string[];
  recommendation: WebsiteIntelligenceRecommendation;
}) {
  const evidenceText =
    params.recommendation.evidence.length > 0
      ? params.recommendation.evidence
          .map(
            (item, index) =>
              `${index + 1}. ${item.finding}${
                item.sourceUrl
                  ? `\nSource: ${item.sourceUrl}`
                  : ""
              }`
          )
          .join("\n\n")
      : "No additional page-level evidence was supplied.";

  const completion =
    await openai.chat.completions.parse({
      model: "gpt-4o-2024-08-06",

      messages: [
        {
          role: "system",
          content: `
You are preparing an implementation-ready website improvement plan for a local service business.

The plan will be handed directly to the business owner or their web developer.

Your job is to remove planning burden.

Critical rules:
- Base recommendations only on the supplied business facts and Website Intelligence evidence.
- Do not invent services, locations, licenses, certifications, guarantees, awards, pricing, years in business, review counts, partnerships, or business claims.
- Do not imply that missing dedicated URLs mean the underlying information is completely absent.
- Distinguish content weakness from structural weakness.
- Prefer practical implementation instructions over SEO or AEO jargon.
- Do not prescribe unnecessary site rebuilds.
- Preserve useful existing content where possible.
- Recommend the smallest website change capable of resolving the observed weakness.
- Suggested paths are recommendations, not statements about current URLs.
- Internal-link recommendations must describe destinations clearly and must not invent existing URLs.
- Do not recommend community sponsorships, events, charity involvement, or local-history content merely to create local relevance.
- The owner or web developer should be able to implement this plan without needing to invent the strategy themselves.
          `.trim(),
        },

        {
          role: "user",
          content: `
Business:
${params.businessName}

Website:
${params.website ?? "Not available"}

Service area:
${params.serviceArea}

Known services:
${params.preferredServices.join(", ") || "Not available"}

Website Intelligence recommendation:
${params.recommendation.title}

Gap type:
${params.recommendation.gapType}

Service:
${params.recommendation.service ?? "Site-wide"}

What MarketForge found:
${params.recommendation.summary}

Why it matters:
${params.recommendation.whyItMatters}

Recommended improvement:
${params.recommendation.recommendedImprovement}

Observed evidence:
${evidenceText}

Create a practical implementation plan for the owner or web developer.

The plan should specify:
- what website change should be made;
- what pages should exist or be improved;
- the purpose of each page;
- recommended H1 direction;
- content sections and what each must cover;
- SEO title and meta-description guidance;
- internal linking;
- sitewide changes where applicable;
- exact implementation checklist;
- how to verify that the change was actually implemented;
- claims or assumptions that must not be invented.

Do not recommend a full redesign unless the evidence actually requires one.
Return the structured response only.
          `.trim(),
        },
      ],

      response_format: zodResponseFormat(
        websiteImplementationPlanSchema,
        "marketforge_website_implementation_plan"
      ),
    });

  const plan =
    completion.choices[0]?.message.parsed;

  if (!plan) {
    throw new Error(
      "MarketForge could not generate the website implementation plan."
    );
  }

  return plan;
}

export async function openWebsiteImplementationPlan(
  recommendationId: string
): Promise<void> {
  const workspace =
    await getCurrentWorkspaceForAeo();

  const existing =
    await prisma.websiteImplementationPlan.findUnique({
      where: {
        workspaceId_recommendationId: {
          workspaceId: workspace.id,
          recommendationId,
        },
      },
    });

  if (existing) {
    redirect(
      `/aeo/implementation/${existing.id}`
    );
  }

  const {
    profile,
    recommendation,
  } = await getGuidedRecommendation({
    workspaceId: workspace.id,
    recommendationId,
  });

  const plan =
    await generateWebsiteImplementationPlan({
      businessName: profile.businessName,
      website: profile.website,
      serviceArea: profile.serviceArea,
      preferredServices:
        profile.preferredServices,
      recommendation,
    });

  const created =
    await prisma.websiteImplementationPlan.create({
      data: {
        workspaceId: workspace.id,

        recommendationId:
          recommendation.id,

        gapType:
          recommendation.gapType,

        service:
          recommendation.service,

        title:
          recommendation.title,

        planJson: plan,
      },
    });

  redirect(
    `/aeo/implementation/${created.id}`
  );
}

async function getCurrentWorkspaceForAeo() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: {
      clerkUserId,
    },
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

  const workspace =
    user?.workspaces[0]?.workspace ?? null;

  if (
    !workspace ||
    !workspace.onboardingCompletedAt
  ) {
    throw new Error(
      "Complete onboarding before creating Website Intelligence actions."
    );
  }

  return workspace;
}

async function getExecutableRecommendation(params: {
  workspaceId: string;
  recommendationId: string;
}): Promise<{
  recommendation: WebsiteIntelligenceRecommendation;
  profile: NonNullable<
    Awaited<
      ReturnType<
        typeof prisma.businessProfile.findUnique
      >
    >
  >;
}> {
  const profile =
    await prisma.businessProfile.findUnique({
      where: {
        workspaceId: params.workspaceId,
      },
    });

  if (!profile) {
    throw new Error(
      "Business profile not found."
    );
  }

  const assessment =
    parseWebsiteIntelligenceAssessment(
      profile.websiteIntelligenceJson
    );

  if (!assessment) {
    throw new Error(
      "Website Intelligence assessment is not available."
    );
  }

  const recommendation =
    buildWebsiteIntelligenceRecommendations(
      assessment
    ).find(
      (item) =>
        item.id === params.recommendationId
    );

  if (!recommendation) {
    throw new Error(
      "Website Intelligence recommendation could not be found."
    );
  }

  if (
    recommendation.executionType !==
    "MARKETFORGE_EXECUTABLE"
  ) {
    throw new Error(
      "This recommendation requires a website change and cannot be created as a MarketForge action."
    );
  }

  return {
    recommendation,
    profile,
  };
}

async function generateAuthorityArticle(params: {
  recommendation: WebsiteIntelligenceRecommendation;
  businessName: string;
  website: string | null;
  serviceArea: string;
  industryLabel: string | null;
}) {
  const evidenceText =
    params.recommendation.evidence.length > 0
      ? params.recommendation.evidence
          .map(
            (item, index) =>
              `${index + 1}. ${item.finding}${
                item.sourceUrl
                  ? `\nSource: ${item.sourceUrl}`
                  : ""
              }`
          )
          .join("\n\n")
      : "No additional page-level evidence was supplied.";

  const completion =
    await openai.chat.completions.parse({
      model: "gpt-4o-2024-08-06",
      messages: [
        {
          role: "system",
          content: `
You create authoritative website content for local service businesses.

The goal is to strengthen useful website authority and customer understanding.

Critical rules:
- Write for real customers, not SEO professionals.
- Be practical, specific, clear, and trustworthy.
- Do not use marketing jargon.
- Do not talk about "AEO", "AI visibility", rankings, algorithms, or optimization in the customer-facing article.
- Do not invent licenses, certifications, years in business, guarantees, pricing, awards, review counts, manufacturer relationships, service capabilities, or geographic claims.
- Do not claim the business is a subject-matter expert merely because MarketForge is creating the article.
- Use only business facts and evidence supplied in the prompt.
- Do not manufacture urgency.
- The article should genuinely help a homeowner understand the subject.
- The CTA should be restrained and appropriate for educational content.
- SEO metadata should describe the actual article, not stuff keywords.
- Internal-link suggestions should describe useful destination topics or existing service content. Do not invent exact URLs.
          `.trim(),
        },
        {
          role: "user",
          content: `
Business:
${params.businessName}

Website:
${params.website ?? "Not available"}

Industry:
${params.industryLabel ?? "Local service business"}

Service area:
${params.serviceArea}

Website Intelligence recommendation:
${params.recommendation.title}

Gap:
${params.recommendation.gapType}

Service:
${params.recommendation.service ?? "Site-wide"}

What MarketForge found:
${params.recommendation.summary}

Why it matters:
${params.recommendation.whyItMatters}

Recommended improvement:
${params.recommendation.recommendedImprovement}

Observed evidence:
${evidenceText}

Create one substantive Knowledge / Authority Article that directly helps address this observed weakness.

The article should:
- answer useful customer questions;
- demonstrate practical knowledge through explanation, not unsupported claims;
- go deeper than a basic service description;
- complement existing service content rather than simply repeating "we offer this service";
- naturally support local-service decision making;
- be ready for owner review before publication.

Also produce:
- SEO title;
- meta description;
- suggested slug;
- internal-link suggestions.

Return the structured response only.
          `.trim(),
        },
      ],
      response_format: zodResponseFormat(
        authorityArticleSchema,
        "marketforge_authority_article"
      ),
    });

  const article =
    completion.choices[0]?.message.parsed;

  if (!article) {
    throw new Error(
      "MarketForge could not generate the authority article."
    );
  }

  return article;
}

function buildBlogAssetContent(params: {
  article: AuthorityArticle;
  industryLabel: string | null;
}) {
  return JSON.stringify({
    kind: "BLOG",
    articleRole:
      "KNOWLEDGE_AUTHORITY_ARTICLE",
    title: params.article.title,
    excerpt: params.article.excerpt,
    introduction:
      params.article.introduction,
    sections: params.article.sections,
    cta: params.article.cta,

    imageKey: "company-logo",
    imageMode: "LOGO",

    industry:
      params.industryLabel ??
      "local-service",

    industryLabel:
      params.industryLabel,
  });
}

function buildSeoAssetContent(
  article: AuthorityArticle
) {
  return [
    `SEO Title: ${article.seoTitle}`,
    "",
    `Meta Description: ${article.metaDescription}`,
    "",
    `Suggested Slug: ${article.suggestedSlug}`,
    "",
    "Internal Linking Suggestions:",
    ...article.internalLinkSuggestions.map(
      (item) => `- ${item}`
    ),
  ].join("\n");
}

export async function createWebsiteIntelligenceAction(
  recommendationId: string
): Promise<void> {
  const workspace =
    await getCurrentWorkspaceForAeo();

  const existingCampaign =
    await prisma.campaign.findFirst({
      where: {
        workspaceId: workspace.id,

        briefJson: {
          path: [
            "websiteIntelligence",
            "recommendationId",
          ],
          equals: recommendationId,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

  if (existingCampaign) {
    redirect(
      `/campaigns/${existingCampaign.id}`
    );
  }

  const {
    recommendation,
    profile,
  } = await getExecutableRecommendation({
    workspaceId: workspace.id,
    recommendationId,
  });

  if (
    recommendation.kind !==
      "AUTHORITY_CONTENT" &&
    recommendation.kind !==
      "SERVICE_CONTENT_IMPROVEMENT"
  ) {
    throw new Error(
      "This Website Intelligence recommendation does not yet have a supported MarketForge execution package."
    );
  }

  const article =
    await generateAuthorityArticle({
      recommendation,
      businessName: profile.businessName,
      website: profile.website,
      serviceArea: profile.serviceArea,
      industryLabel:
        profile.industryLabel,
    });

  const campaign =
    await prisma.campaign.create({
      data: {
        workspaceId: workspace.id,

        recommendationId: null,
        revenueOpportunityId: null,

        name: recommendation.title,

        campaignType: "SEO_CONTENT",
        objective:
          "IMPROVE_AI_SEARCH_VISIBILITY",

        targetService:
          recommendation.service ??
          "Website Authority",

        offer: null,

        audience:
          "Homeowners and website visitors looking for useful service information",

        serviceArea:
          profile.serviceArea,

        estimatedLeads: null,
        estimatedBookedJobs: null,
        estimatedRevenue: null,

        status: "DRAFT",
        qualityReviewStatus:
          "PENDING",

        briefJson: {
          market:
            "WEBSITE_INTELLIGENCE",

          campaignOrigin:
            "website_intelligence",

          websiteIntelligence: {
            recommendationId:
              recommendation.id,

            gapType:
              recommendation.gapType,

            service:
              recommendation.service,

            kind:
              recommendation.kind,

            executionType:
              recommendation.executionType,

            summary:
              recommendation.summary,

            whyItMatters:
              recommendation.whyItMatters,

            recommendedImprovement:
              recommendation.recommendedImprovement,

            evidence:
              recommendation.evidence,

            assessmentWebsite:
              profile.website,
          },

          actionThesis: {
            title:
              recommendation.title,

            summary:
              recommendation.summary,

            audience:
              "Homeowners and website visitors who need useful, trustworthy service information",

            offerHint: "",

            ctaHint:
              "Review and approve the content",

            imageKey:
              "company-logo",

            imageMode:
              "LOGO",

            whyThisActionBullets: [
              recommendation.whyItMatters,
              "MarketForge identified this improvement from the current live website assessment.",
              "The action is intended to strengthen website authority and customer understanding rather than claim direct short-term revenue.",
              "The Website Intelligence assessment will not improve until a future crawl observes the approved work on the live website.",
            ],
          },

          nextBestAction: {
            actionType:
              "AEO_CONTENT",

            executionMode:
              "ACTION_PACK",

            title:
              recommendation.title,

            summary:
              recommendation.summary,
          },

          campaignDraft: {
            description:
              recommendation.recommendedImprovement,

            offer: null,

            audience:
              "Homeowners and website visitors looking for useful service information",

            cta:
              "Review and approve the content",
          },

          imageKey:
            "company-logo",

          imageMode:
            "LOGO",

          generatedAt:
            new Date().toISOString(),
        },
      },
    });

  await prisma.campaignAsset.createMany({
    data: [
      {
        campaignId: campaign.id,

        assetType: "BLOG",

        title:
          "Knowledge / Authority Article",

        content:
          buildBlogAssetContent({
            article,
            industryLabel:
              profile.industryLabel,
          }),

        metadataJson: {
          market:
            "WEBSITE_INTELLIGENCE",

          websiteIntelligenceRecommendationId:
            recommendation.id,

          purpose:
            "Address the observed Website Intelligence authority or knowledge gap.",
        },
      },

      {
        campaignId: campaign.id,

        assetType: "SEO",

        title:
          "SEO & Publishing Guidance",

        content:
          buildSeoAssetContent(article),

        metadataJson: {
          market:
            "WEBSITE_INTELLIGENCE",

          websiteIntelligenceRecommendationId:
            recommendation.id,

          purpose:
            "Support publication of the Knowledge / Authority Article without creating unsupported website claims.",
        },
      },
    ],
  });

  redirect(`/campaigns/${campaign.id}`);
}