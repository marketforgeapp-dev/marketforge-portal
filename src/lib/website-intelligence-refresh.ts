import { zodResponseFormat } from "openai/helpers/zod";
import { Prisma } from "@/generated/prisma";

import { openai } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { getWebsitePrefillContext } from "@/lib/website-prefill-context";
import {
  normalizeWebsiteIntelligenceAssessment,
  parseWebsiteIntelligenceAssessment,
  websiteIntelligenceAssessmentSchema,
  type WebsiteIntelligenceAssessment,
  type WebsiteIntelligenceObservedSignals,
} from "@/lib/website-intelligence";

export type WebsiteIntelligenceRefreshResult = {
  status:
    | "completed"
    | "skipped"
    | "no_profile"
    | "no_website"
    | "crawl_failed"
    | "assessment_failed";
  previousScore: number | null;
  nextScore: number | null;
  materialChangeLikely: boolean;
};

function getStartOfCurrentWeek(): Date {
  const now = new Date();
  const day = now.getDay();

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(now.getDate() - day);

  return start;
}

function uniqueStrings(
  values: Array<string | null | undefined>
): string[] {
  return Array.from(
    new Set(
      values
        .map((value) =>
          typeof value === "string" ? value.trim() : ""
        )
        .filter(Boolean)
    )
  );
}

function normalizeComparable(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isObviousNonContentUrl(value: string): boolean {
  try {
    const pathname = new URL(value).pathname.toLowerCase();

    return (
      pathname.startsWith("/contact") ||
      pathname.startsWith("/about") ||
      pathname.startsWith("/privacy") ||
      pathname.startsWith("/terms") ||
      pathname.startsWith("/careers") ||
      pathname.startsWith("/jobs") ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/sign-in") ||
      pathname.startsWith("/cdn-cgi")
    );
  } catch {
    return true;
  }
}

function looksLikeKnowledgeUrl(params: {
  url: string;
  title?: string | null;
}): boolean {
  const combined = `${params.url} ${params.title ?? ""}`.toLowerCase();

  return (
    combined.includes("/blog") ||
    combined.includes("/article") ||
    combined.includes("/articles") ||
    combined.includes("/resource") ||
    combined.includes("/resources") ||
    combined.includes("/guide") ||
    combined.includes("/guides") ||
    combined.includes("/learn")
  );
}

function looksLikeFaqUrl(params: {
  url: string;
  title?: string | null;
}): boolean {
  const combined = `${params.url} ${params.title ?? ""}`.toLowerCase();

  return (
    combined.includes("/faq") ||
    combined.includes("frequently asked questions")
  );
}

function looksLikeServiceContent(params: {
  url: string;
  text?: string | null;
  services: string[];
}): boolean {
  if (isObviousNonContentUrl(params.url)) {
    return false;
  }

  const combined = normalizeComparable(
    `${params.url} ${params.text ?? ""}`
  );

  if (!combined) {
    return false;
  }

  const genericServiceSignals = [
    "service",
    "repair",
    "installation",
    "install",
    "replacement",
    "maintenance",
    "inspection",
    "emergency",
  ];

  if (
    genericServiceSignals.some((signal) =>
      combined.includes(signal)
    )
  ) {
    return true;
  }

  return params.services.some((service) => {
    const serviceKey = normalizeComparable(service);

    return serviceKey.length > 2 && combined.includes(serviceKey);
  });
}

function buildObservedSignals(params: {
  website: string;
  websiteContext: NonNullable<
    Awaited<ReturnType<typeof getWebsitePrefillContext>>
  >;
  preferredServices: string[];
  existingServicePageUrls: string[];
  serviceArea: string | null;
  city: string | null;
}): WebsiteIntelligenceObservedSignals {
  const { websiteContext } = params;

  const serviceContentUrls = uniqueStrings([
    ...params.existingServicePageUrls,

    ...websiteContext.internalLinks
      .filter((link) =>
        looksLikeServiceContent({
          url: link.href,
          text: link.text,
          services: params.preferredServices,
        })
      )
      .map((link) => link.href),

    ...websiteContext.fetchedPages
      .filter((page) =>
        looksLikeServiceContent({
          url: page.url,
          text: `${page.title ?? ""} ${page.visibleTextExcerpt ?? ""}`,
          services: params.preferredServices,
        })
      )
      .map((page) => page.url),
  ]).slice(0, 30);

  const dedicatedKnowledgeUrls = uniqueStrings([
    ...websiteContext.internalLinks
      .filter((link) =>
        looksLikeKnowledgeUrl({
          url: link.href,
          title: link.text,
        })
      )
      .map((link) => link.href),

    ...websiteContext.fetchedPages
      .filter((page) =>
        looksLikeKnowledgeUrl({
          url: page.url,
          title: page.title,
        })
      )
      .map((page) => page.url),
  ]).slice(0, 30);

  const dedicatedFaqUrls = uniqueStrings([
    ...websiteContext.internalLinks
      .filter((link) =>
        looksLikeFaqUrl({
          url: link.href,
          title: link.text,
        })
      )
      .map((link) => link.href),

    ...websiteContext.fetchedPages
      .filter((page) =>
        looksLikeFaqUrl({
          url: page.url,
          title: page.title,
        })
      )
      .map((page) => page.url),
  ]).slice(0, 20);

  const detectedServiceAreaLocations = uniqueStrings([
    ...(params.serviceArea
      ? params.serviceArea
          .split(/[,;|]+/)
          .map((value) =>
            value.replace(/^and\s+/i, "").trim()
          )
      : []),
    params.city,
  ]).slice(0, 50);

  return {
    serviceContentUrls,
    dedicatedKnowledgeUrls,
    dedicatedFaqUrls,
    detectedServiceAreaLocations,
    googleBusinessProfileLinkObserved: Boolean(
      websiteContext.googleBusinessProfileUrl
    ),
  };
}

function buildAssessmentSignature(
  assessment: WebsiteIntelligenceAssessment | null
): string | null {
  if (!assessment) {
    return null;
  }

  return JSON.stringify({
    dimensions: {
      businessUnderstanding:
        assessment.dimensions.businessUnderstanding.status,
      serviceAuthority:
        assessment.dimensions.serviceAuthority.status,
      knowledgeDepth:
        assessment.dimensions.knowledgeDepth.status,
      structuredClarity:
        assessment.dimensions.structuredClarity.status,
      localRelevance:
        assessment.dimensions.localRelevance.status,
      trustCredibility:
        assessment.dimensions.trustCredibility.status,
      consistency:
        assessment.dimensions.consistency.status,
    },

    serviceCoverage: assessment.serviceCoverage
      .map((service) => ({
        service: normalizeComparable(service.service),
        presence: service.presence,
        depth: service.depth,
        structure: service.structure,
      }))
      .sort((a, b) => a.service.localeCompare(b.service)),

    gaps: assessment.strongestGaps
      .map((gap) => ({
        type: gap.type,
        service: gap.service
          ? normalizeComparable(gap.service)
          : null,
      }))
      .sort((a, b) =>
        `${a.type}:${a.service ?? ""}`.localeCompare(
          `${b.type}:${b.service ?? ""}`
        )
      ),

    observedSignals: {
      serviceContentUrls: [
        ...assessment.observedSignals.serviceContentUrls,
      ].sort(),
      dedicatedKnowledgeUrls: [
        ...assessment.observedSignals.dedicatedKnowledgeUrls,
      ].sort(),
      dedicatedFaqUrls: [
        ...assessment.observedSignals.dedicatedFaqUrls,
      ].sort(),
    },
  });
}

export async function ensureWorkspaceWebsiteIntelligenceFreshForWeek(
  workspaceId: string
): Promise<WebsiteIntelligenceRefreshResult> {
  const profile = await prisma.businessProfile.findUnique({
    where: { workspaceId },
    select: {
      businessName: true,
      website: true,
      industryLabel: true,
      preferredServices: true,
      servicePageUrls: true,
      serviceArea: true,
      city: true,
      state: true,
      googleBusinessProfileUrl: true,
      websiteIntelligenceJson: true,
      lastWebsiteIntelligenceRefreshAt: true,
    },
  });

  if (!profile) {
    return {
      status: "no_profile",
      previousScore: null,
      nextScore: null,
      materialChangeLikely: false,
    };
  }

  const previousAssessment =
    parseWebsiteIntelligenceAssessment(
      profile.websiteIntelligenceJson
    );

  const previousScore =
    previousAssessment?.internalReadinessScore ?? null;

  const startOfWeek = getStartOfCurrentWeek();

  if (
    profile.lastWebsiteIntelligenceRefreshAt &&
    profile.lastWebsiteIntelligenceRefreshAt >= startOfWeek
  ) {
    console.log(
      "[website-intelligence-refresh] SKIP weekly gate",
      {
        workspaceId,
        lastWebsiteIntelligenceRefreshAt:
          profile.lastWebsiteIntelligenceRefreshAt,
      }
    );

    return {
      status: "skipped",
      previousScore,
      nextScore: previousScore,
      materialChangeLikely: false,
    };
  }

  const website = profile.website?.trim();

  if (!website) {
    return {
      status: "no_website",
      previousScore,
      nextScore: previousScore,
      materialChangeLikely: false,
    };
  }

  console.log("[website-intelligence-refresh] START", {
    workspaceId,
    website,
  });

  const websiteContext = await getWebsitePrefillContext(
    website
  ).catch((error) => {
    console.error(
      "[website-intelligence-refresh] crawl failed",
      {
        workspaceId,
        website,
        error,
      }
    );

    return null;
  });

  if (!websiteContext) {
    return {
      status: "crawl_failed",
      previousScore,
      nextScore: previousScore,
      materialChangeLikely: false,
    };
  }

  const observedSignals = buildObservedSignals({
    website,
    websiteContext,
    preferredServices: profile.preferredServices ?? [],
    existingServicePageUrls: profile.servicePageUrls ?? [],
    serviceArea: profile.serviceArea,
    city: profile.city,
  });

  const allowedSourceUrls = uniqueStrings([
    websiteContext.normalizedWebsite ?? website,
    ...websiteContext.internalLinks.map((link) => link.href),
    ...websiteContext.fetchedPages.map((page) => page.url),
    ...observedSignals.serviceContentUrls,
    ...observedSignals.dedicatedKnowledgeUrls,
    ...observedSignals.dedicatedFaqUrls,
  ]);

  try {
    const completion = await openai.chat.completions.parse({
      model: "gpt-4o-2024-08-06",
      messages: [
        {
          role: "system",
          content: `
You assess Website Intelligence for MarketForge, a revenue execution system for local service businesses.

Your job is to determine how clearly, credibly, and usefully the supplied public website establishes the business and its service expertise.

Evaluate these dimensions:

1. Business Understanding
2. Service Authority
3. Knowledge Depth
4. Structured Clarity
5. Local Relevance
6. Trust & Credibility
7. Consistency

Status values:

STRONG
= strong grounded evidence exists

PARTIAL
= meaningful evidence exists, but important depth or completeness is limited

WEAK
= the signal exists only minimally or superficially

INSUFFICIENT_EVIDENCE
= the supplied crawl does not provide enough reliable evidence to judge

Important rules:

- Evaluate information wherever it exists on the website.
- Content may live on dedicated pages, consolidated service pages, homepage sections, anchors, FAQs, articles, or other structures.
- Do not treat poor structure as absence of content.
- Evaluate content presence, depth, structure, coverage, and consistency separately.
- Do not require a blog or standalone FAQ page for strong knowledge if useful knowledge exists elsewhere.
- Do not require community involvement, sponsorships, charitable activity, local stories, or local history for strong Local Relevance.
- Local Relevance is about whether the website clearly establishes where the business operates and serves customers.
- Do not invent certifications, experience, services, locations, credentials, guarantees, or facts.
- Evidence sourceUrl must be one of the supplied website URLs or null.
- Assess each supplied required service independently.
- Do not award strong service depth merely because the service name appears.
- strongestGaps should include only meaningful, evidence-backed gaps.
- Return fewer gaps when fewer meaningful gaps exist.
- internalReadinessScore may be estimated; MarketForge recalculates it deterministically.
- Return structured output only.
          `.trim(),
        },
        {
          role: "user",
          content: JSON.stringify(
            {
              business: {
                businessName: profile.businessName,
                industryLabel: profile.industryLabel,
                website,
                city: profile.city,
                state: profile.state,
                serviceArea: profile.serviceArea,
                googleBusinessProfileUrl:
                  profile.googleBusinessProfileUrl,
              },

              requiredServices:
                profile.preferredServices ?? [],

              websiteContext: {
                normalizedWebsite:
                  websiteContext.normalizedWebsite ?? website,
                title: websiteContext.title ?? null,
                metaDescription:
                  websiteContext.metaDescription ?? null,
                detectedPhone: websiteContext.phone ?? null,
                detectedEmail: websiteContext.email ?? null,
                detectedAddress:
                  websiteContext.address ?? null,
                detectedCity: websiteContext.city ?? null,
                detectedState: websiteContext.state ?? null,
                internalLinks:
                  websiteContext.internalLinks.map((link) => ({
                    text: link.text,
                    href: link.href,
                  })),
                homepageText:
                  websiteContext.visibleTextExcerpt ?? null,
                fetchedPages: websiteContext.fetchedPages,
              },

              observedSignals,
            },
            null,
            2
          ),
        },
      ],
      response_format: zodResponseFormat(
        websiteIntelligenceAssessmentSchema,
        "marketforge_weekly_website_intelligence"
      ),
    });

    const parsed = completion.choices[0]?.message.parsed;

    if (!parsed) {
      return {
        status: "assessment_failed",
        previousScore,
        nextScore: previousScore,
        materialChangeLikely: false,
      };
    }

    const normalized =
      normalizeWebsiteIntelligenceAssessment({
        assessment: parsed,
        website:
          websiteContext.normalizedWebsite ?? website,
        allowedSourceUrls,
        observedSignals,
        requiredServices:
          profile.preferredServices ?? [],
      });

    const previousSignature =
      buildAssessmentSignature(previousAssessment);

    const nextSignature =
      buildAssessmentSignature(normalized);

    const materialChangeLikely =
      previousSignature !== nextSignature;

    await prisma.businessProfile.update({
      where: { workspaceId },
      data: {
        websiteIntelligenceJson:
          normalized as unknown as Prisma.InputJsonValue,
        lastWebsiteIntelligenceRefreshAt: new Date(),
      },
    });

    console.log(
      "[website-intelligence-refresh] COMPLETE",
      {
        workspaceId,
        previousScore,
        nextScore: normalized.internalReadinessScore,
        materialChangeLikely,
        strongestGapTypes:
          normalized.strongestGaps.map((gap) => gap.type),
      }
    );

    return {
      status: "completed",
      previousScore,
      nextScore: normalized.internalReadinessScore,
      materialChangeLikely,
    };
  } catch (error) {
    console.error(
      "[website-intelligence-refresh] assessment failed",
      {
        workspaceId,
        website,
        error,
      }
    );

    return {
      status: "assessment_failed",
      previousScore,
      nextScore: previousScore,
      materialChangeLikely: false,
    };
  }
}