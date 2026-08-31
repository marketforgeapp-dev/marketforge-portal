"use server";

import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { openai } from "@/lib/openai";
import {
  onboardingPrefillSchema,
  type OnboardingPrefillResult,
} from "@/lib/onboarding-prefill-schema";
import { getWebsitePrefillContext } from "@/lib/website-prefill-context";
import {
  normalizeWebsiteIntelligenceAssessment,
  type WebsiteIntelligenceObservedSignals,
} from "@/lib/website-intelligence";
import { resolveBusinessLocation } from "@/lib/business-location-resolution";
import {
  discoverLocalCompetitors,
  lookupSingleCompetitor,
} from "@/lib/google-places-competitors";
import {
  inferGoogleVisibilitySignals,
  inferIndustryFromBusinessContext,
  inferServicesFromLinks,
} from "@/lib/industry-onboarding";
import { mergeAndDedupeServicesForIndustry } from "@/lib/service-normalization";
import type { SupportedIndustry } from "@/lib/industry-service-map";

type PrefillResponse =
  | {
      success: true;
      data: OnboardingPrefillResult;
    }
  | {
      success: false;
      error: string;
    };

function normalizeWebsite(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function cleanString(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter((value) => value.length > 0)
    )
  );
}

function normalizeServiceLabelForComparison(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function removeNestedServiceDuplicates(values: string[]): string[] {
  const normalized = values.map((service) => ({
    service,
    key: normalizeServiceLabelForComparison(service),
  }));

  return normalized
    .filter((candidate, candidateIndex) => {
      if (!candidate.key) {
        return false;
      }

      return !normalized.some((other, otherIndex) => {
        if (candidateIndex === otherIndex || !other.key) {
          return false;
        }

        if (candidate.key === other.key) {
          return otherIndex < candidateIndex;
        }

        const candidateWords = candidate.key.split(" ");
        const otherWords = other.key.split(" ");

        const extraWords = otherWords.filter(
          (word) => !candidateWords.includes(word)
        );

        const meaningChangingQualifiers = new Set([
          "emergency",
          "commercial",
          "residential",
          "installation",
          "repair",
          "replacement",
          "maintenance",
          "inspection",
        ]);

        if (
          extraWords.some((word) => meaningChangingQualifiers.has(word))
        ) {
          return false;
        }

        return (
          other.key.length > candidate.key.length &&
          candidateWords.every((word) => otherWords.includes(word)) &&
          extraWords.length === 1
        );
      });
    })
    .map((item) => item.service);
}

function selectBestBusinessLogoUrl(params: {
  website: string;
  logoCandidates: string[];
  aiLogoUrl?: string | null;
}): string | null {
  let websiteHostname: string | null = null;

  try {
    websiteHostname = new URL(params.website).hostname
      .replace(/^www\./, "")
      .toLowerCase();
  } catch {
    websiteHostname = null;
  }

  const candidates = uniqueStrings([
    ...params.logoCandidates,
    params.aiLogoUrl,
  ]).filter((candidate) => {
    try {
      const url = new URL(candidate);
      const hostname = url.hostname.toLowerCase();
      const pathname = url.pathname.toLowerCase();

      const isKnownPlatformOrThirdPartyBranding =
        hostname === "cdn.jobber.com" &&
        (
          pathname.includes("/logos/third-party/") ||
          pathname.includes("/logos/v1/logo_jobber")
        );

      const isGoogleBranding =
        pathname.includes("logo_google") ||
        pathname.includes("icon_google");

      const isGoogleReviewAvatar =
        hostname === "lh3.googleusercontent.com";

      return (
        !isKnownPlatformOrThirdPartyBranding &&
        !isGoogleBranding &&
        !isGoogleReviewAvatar
      );
    } catch {
      return false;
    }
  });

  if (candidates.length === 0) {
    return null;
  }

  const sameDomainCandidate = candidates.find((candidate) => {
    if (!websiteHostname) return false;

    try {
      const candidateHostname = new URL(candidate).hostname
        .replace(/^www\./, "")
        .toLowerCase();

      return (
        candidateHostname === websiteHostname ||
        candidateHostname.endsWith(`.${websiteHostname}`)
      );
    } catch {
      return false;
    }
  });

  if (sameDomainCandidate) {
    return sameDomainCandidate;
  }

  const explicitLogoCandidate = candidates.find((candidate) => {
    try {
      return new URL(candidate).pathname.toLowerCase().includes("logo");
    } catch {
      return false;
    }
  });

  return explicitLogoCandidate ?? candidates[0] ?? null;
}

function isObviousNonServicePageUrl(value: string): boolean {
  try {
    const url = new URL(value);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return true;
    }

    const pathname = url.pathname.toLowerCase();

    const nonServicePathPatterns = [
      /^\/about(?:[-/]|$)/,
      /^\/contact(?:[-/]|$)/,
      /^\/privacy(?:[-/]|$)/,
      /^\/terms(?:[-/]|$)/,
      /^\/team(?:[-/]|$)/,
      /^\/meet[-/]our[-/]team(?:[-/]|$)/,
      /^\/careers?(?:[-/]|$)/,
      /^\/jobs?(?:[-/]|$)/,
      /^\/employment(?:[-/]|$)/,
      /^\/accept[-/]proposal(?:[-/]|$)/,
      /^\/proposal(?:[-/]|$)/,
      /^\/appointments?(?:[-/]|$)/,
      /^\/book(?:[-/]|$)/,
      /^\/booking(?:[-/]|$)/,
      /^\/schedule(?:[-/]|$)/,
      /^\/reviews?(?:[-/]|$)/,
      /^\/testimonials?(?:[-/]|$)/,
      /^\/gallery(?:[-/]|$)/,
      /^\/portfolio(?:[-/]|$)/,
      /^\/financing(?:[-/]|$)/,
      /^\/specials?(?:[-/]|$)/,
      /^\/coupons?(?:[-/]|$)/,
      /^\/login(?:[-/]|$)/,
      /^\/sign[-/]in(?:[-/]|$)/,
      /^\/cdn-cgi(?:[-/]|$)/,
    ];

    return nonServicePathPatterns.some((pattern) =>
      pattern.test(pathname)
    );
  } catch {
    return true;
  }
}

function splitCommaSeparatedValues(
  values: Array<string | null | undefined>
): string[] {
  return values.flatMap((value) => {
    const cleaned = cleanString(value);

    if (!cleaned) {
      return [];
    }

    return cleaned
      .split(/[,;|]+/)
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
  });
}

function isServiceAreaNoise(value: string): boolean {
  const cleaned = value.trim();
  const lower = cleaned.toLowerCase();

  if (!lower) return true;
  if (lower.length < 2) return true;
  if (lower.length > 80) return true;

  if (
    /\b(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})\b/.test(
      cleaned
    )
  ) {
    return true;
  }

  const noisyValues = new Set([
    "about",
    "about us",
    "accept proposal",
    "articles",
    "blog",
    "book now",
    "careers",
    "commercial",
    "commercial hvac",
    "contact",
    "contact us",
    "coupons",
    "emergency",
    "financing",
    "get estimate",
    "get started",
    "home",
    "learn more",
    "make an appointment",
    "meet our team",
    "new construction",
    "new construction hvac",
    "privacy",
    "privacy policy",
    "request estimate",
    "request service",
    "residential",
    "residential hvac",
    "resources",
    "reviews",
    "schedule",
    "schedule service",
    "service",
    "services",
    "specials",
    "terms",
    "terms & conditions",
    "terms and conditions",
    "testimonials",
  ]);

  if (noisyValues.has(lower)) {
    return true;
  }

  const actionPhrases = [
    "accept proposal",
    "appointment",
    "book online",
    "call now",
    "contact us",
    "get a quote",
    "get an estimate",
    "learn more",
    "request a quote",
    "request service",
    "schedule now",
    "schedule service",
  ];

  if (actionPhrases.some((phrase) => lower.includes(phrase))) {
    return true;
  }

  return false;
}

function cleanServiceAreaParts(
  values: Array<string | null | undefined>
): string[] {
  const seen = new Set<string>();
  const cleanedParts: string[] = [];

  for (const part of splitCommaSeparatedValues(values)) {
    const cleaned = part
      .trim()
      .replace(/^and\s+/i, "")
      .trim();

    const key = cleaned.toLowerCase();

    if (!cleaned || isServiceAreaNoise(cleaned) || seen.has(key)) {
      continue;
    }

    seen.add(key);
    cleanedParts.push(cleaned);
  }

  return cleanedParts;
}

function sanitizeLocationValue(
  value: string | null | undefined,
  kind: "city" | "state"
): string | null {
  const cleaned = cleanString(value);

  if (!cleaned) return null;

  if (kind === "state") {
    return /^[A-Z]{2}$/.test(cleaned) ? cleaned : null;
  }

  if (cleaned.length > 40) return null;
  if (cleaned.split(" ").length > 4) return null;

  const lower = cleaned.toLowerCase();

  if (
    lower.includes("contact us") ||
    lower.includes("schedule") ||
    lower.includes("appointment") ||
    lower.includes("plumbing") ||
    lower.includes("services") ||
    lower.includes("solutions") ||
    lower.includes("near") ||
    lower.includes("today") ||
    lower.includes("free")
  ) {
    return null;
  }

  return /^[A-Za-z .'\-]+$/.test(cleaned) ? cleaned : null;
}

function normalizeDomain(url: string | null | undefined): string | null {
  if (!url) return null;

  try {
    const normalized =
      url.startsWith("http://") || url.startsWith("https://")
        ? url
        : `https://${url}`;

    return new URL(normalized).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

const marketAnchorSchema = z.object({
  city: z.string().nullable(),
  state: z.string().nullable(),
  serviceArea: z.string().nullable(),
  confidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
  source: z.enum([
    "explicit_service_area",
    "website_address",
    "website_city",
    "uncertain",
  ]),
  rationale: z.string(),
});

type MarketAnchor = z.infer<typeof marketAnchorSchema>;

function cleanMarketAnchor(anchor: MarketAnchor): MarketAnchor {
  const city = sanitizeLocationValue(anchor.city, "city");
  const state = sanitizeLocationValue(anchor.state, "state");

  if (!city || !state) {
    return {
      city: null,
      state: null,
      serviceArea: null,
      confidence: "LOW",
      source: "uncertain",
      rationale:
        "Market anchor was rejected because it did not include a valid city and state.",
    };
  }

  return {
    ...anchor,
    city,
    state,
    serviceArea: cleanString(anchor.serviceArea),
  };
}

async function resolveCompetitorMarketAnchor(params: {
  companyName: string;
  website: string;
  industry: SupportedIndustry;
  websiteContext: Awaited<ReturnType<typeof getWebsitePrefillContext>>;
  resolvedLocation: Awaited<ReturnType<typeof resolveBusinessLocation>>;
}): Promise<MarketAnchor> {
  const websiteContext = params.websiteContext;
  const resolvedLocation = params.resolvedLocation;

  const fallbackCity =
    resolvedLocation.resolvedCity ?? websiteContext?.city ?? null;
  const fallbackState =
    resolvedLocation.resolvedState ?? websiteContext?.state ?? null;

  const fallbackAnchor = cleanMarketAnchor({
    city: fallbackCity,
    state: fallbackState,
    serviceArea: null,
    confidence: fallbackCity && fallbackState ? "LOW" : "LOW",
    source: fallbackCity && fallbackState ? "website_city" : "uncertain",
    rationale:
      "Fallback anchor from existing location resolution. This should only be used when no explicit service-area market can be determined.",
  });

  try {
    const completion = await openai.chat.completions.parse({
      model: "gpt-4o-2024-08-06",
      messages: [
        {
          role: "system",
          content: `
You resolve the best local market anchor for Google competitor discovery.

Return one concrete city and state that should anchor local competitor search.

Rules:
- Prefer explicit service area pages, "areas served", counties, and city lists from the website.
- For service-area businesses, do NOT default to a broad metro city if the website points to a more specific served market.
- Do NOT return navigation labels like About Us, Blog, Testimonials, Residential HVAC, Commercial HVAC, or service names.
- Do NOT return a county as the city.
- If the website references Cherokee County, prefer a concrete city inside that service area such as Canton or Woodstock when supported.
- If the only available city is a broad metro fallback like Atlanta, return it only with LOW confidence.
- If uncertain, return null city/state and LOW confidence.
- Return structured output only.
          `.trim(),
        },
        {
          role: "user",
          content: JSON.stringify(
            {
              companyName: params.companyName,
              website: params.website,
              industry: params.industry,
              resolvedLocation: {
                resolvedAddress: resolvedLocation.resolvedAddress,
                resolvedCity: resolvedLocation.resolvedCity,
                resolvedState: resolvedLocation.resolvedState,
                citySource: resolvedLocation.citySource,
                stateSource: resolvedLocation.stateSource,
                addressSource: resolvedLocation.addressSource,
              },
              websiteContext: {
                title: websiteContext?.title ?? null,
                metaDescription: websiteContext?.metaDescription ?? null,
                detectedAddress: websiteContext?.address ?? null,
                detectedCity: websiteContext?.city ?? null,
                detectedState: websiteContext?.state ?? null,
                googleBusinessProfileUrl:
                  websiteContext?.googleBusinessProfileUrl ?? null,
                internalLinks:
                  websiteContext?.internalLinks.map((link) => ({
                    text: link.text,
                    href: link.href,
                  })) ?? [],
                homepageText: websiteContext?.visibleTextExcerpt ?? null,
                fetchedPages: websiteContext?.fetchedPages ?? [],
              },
            },
            null,
            2
          ),
        },
      ],
      response_format: zodResponseFormat(
        marketAnchorSchema,
        "marketforge_competitor_market_anchor"
      ),
    });

    const parsed = completion.choices[0]?.message.parsed;

    if (!parsed) {
      return fallbackAnchor;
    }

    const cleaned = cleanMarketAnchor(parsed);

    if (cleaned.confidence === "LOW" || !cleaned.city || !cleaned.state) {
      return fallbackAnchor;
    }

    return cleaned;
  } catch (error) {
    console.warn("[onboarding] market anchor resolver failed", {
      companyName: params.companyName,
      website: params.website,
      error,
    });

    return fallbackAnchor;
  }
}

export async function generateOnboardingPrefill(input: {
  companyName: string;
  website: string;
}): Promise<PrefillResponse> {
  const companyName = input.companyName.trim();
  const website = normalizeWebsite(input.website);

  if (!companyName || !website) {
    return {
      success: false,
      error: "Enter a company name and website to generate suggestions.",
    };
  }

  try {
    const websiteContext = await getWebsitePrefillContext(website);

    const resolvedLocation = await resolveBusinessLocation({
      companyName,
      website,
      websiteContext,
    });

    console.info("Onboarding business location resolution", {
      companyName,
      website,
      websiteAddress: resolvedLocation.websiteAddress,
      websiteCity: resolvedLocation.websiteCity,
      websiteState: resolvedLocation.websiteState,
      googlePlaceAddress: resolvedLocation.googlePlaceAddress,
      googlePlaceCity: resolvedLocation.googlePlaceCity,
      googlePlaceState: resolvedLocation.googlePlaceState,
      googlePlaceLocation: resolvedLocation.googlePlaceLocation,
      resolvedAddress: resolvedLocation.resolvedAddress,
      resolvedCity: resolvedLocation.resolvedCity,
      resolvedState: resolvedLocation.resolvedState,
      addressSource: resolvedLocation.addressSource,
      citySource: resolvedLocation.citySource,
      stateSource: resolvedLocation.stateSource,
      googleBusinessProfileUrl: resolvedLocation.googleBusinessProfileUrl,
    });

        console.info("Onboarding website logo candidates", {
      companyName,
      website,
      logoCandidates: websiteContext?.logoCandidates ?? [],
    });

    const inferredIndustry: SupportedIndustry = inferIndustryFromBusinessContext({
      companyName,
      websiteText:
        `${websiteContext?.visibleTextExcerpt ?? ""} ${websiteContext?.fetchedPages
          .map((page) => page.visibleTextExcerpt)
          .join(" ") ?? ""}`.trim(),
      linkTexts: websiteContext?.internalLinks ?? [],
    });

    const serviceInferenceLinks = [
      ...(websiteContext?.internalLinks ?? []),

      {
        text: websiteContext?.visibleTextExcerpt ?? "",
        href: websiteContext?.normalizedWebsite ?? website,
      },

      ...(websiteContext?.fetchedPages ?? []).map((page) => ({
        text: `${page.title ?? ""} ${page.visibleTextExcerpt ?? ""}`,
        href: page.url,
      })),
    ];

    const inferredServices = inferServicesFromLinks({
      industry: inferredIndustry,
      links: serviceInferenceLinks,
    });

    const marketAnchor = await resolveCompetitorMarketAnchor({
      companyName,
      website,
      industry: inferredIndustry,
      websiteContext,
      resolvedLocation,
    });

    const competitorDiscoveryCity = marketAnchor.city;
    const competitorDiscoveryState = marketAnchor.state;

    const websiteServiceAreaText = [
      websiteContext?.visibleTextExcerpt ?? "",
      ...(websiteContext?.fetchedPages?.map((page) => page.visibleTextExcerpt) ?? []),
    ]
      .join(" ")
      .toLowerCase();

    const regionalServiceAreaSignals = [
      websiteServiceAreaText.includes("metro atlanta") ? "Metro Atlanta" : null,
      websiteServiceAreaText.includes("greater atlanta") ? "Greater Atlanta" : null,
      websiteServiceAreaText.includes("north atlanta") ? "North Atlanta" : null,
      websiteServiceAreaText.includes("north georgia") ? "North Georgia" : null,
      websiteServiceAreaText.includes("cherokee county") ? "Cherokee County" : null,
      websiteServiceAreaText.includes("cobb county") ? "Cobb County" : null,
      websiteServiceAreaText.includes("dawson county") ? "Dawson County" : null,
      websiteServiceAreaText.includes("forsyth county") ? "Forsyth County" : null,
      websiteServiceAreaText.includes("fulton county") ? "Fulton County" : null,
      websiteServiceAreaText.includes("gwinnett county") ? "Gwinnett County" : null,
      websiteServiceAreaText.includes("hall county") ? "Hall County" : null,
      websiteServiceAreaText.includes("lumpkin county") ? "Lumpkin County" : null,
    ].filter((value): value is string => Boolean(value));

    const competitorDiscoveryServiceAreaParts = cleanServiceAreaParts([
      marketAnchor.serviceArea,
      ...regionalServiceAreaSignals,
      resolvedLocation.resolvedCity,
      websiteContext?.city,
      marketAnchor.city,
    ]);

    const competitorDiscoveryServiceArea =
      competitorDiscoveryServiceAreaParts.slice(0, 10).join(", ") ||
      marketAnchor.city;

    console.info("Resolved competitor discovery inputs", {
      companyName,
      inferredIndustry,
      city: competitorDiscoveryCity,
      state: competitorDiscoveryState,
      serviceArea: competitorDiscoveryServiceArea,
      website,
      resolvedAddress: resolvedLocation.resolvedAddress,
      googlePlaceLocation: resolvedLocation.googlePlaceLocation,
      citySource: resolvedLocation.citySource,
      stateSource: resolvedLocation.stateSource,
      addressSource: resolvedLocation.addressSource,
      websiteCity: websiteContext?.city ?? null,
      websiteState: websiteContext?.state ?? null,
      googleBusinessProfileUrl: websiteContext?.googleBusinessProfileUrl ?? null,
      marketAnchor,
    });

    const competitorCandidates =
      competitorDiscoveryCity && competitorDiscoveryState
        ? await discoverLocalCompetitors({
        companyName,
        industry: inferredIndustry,
        city: competitorDiscoveryCity,
        state: competitorDiscoveryState,
        serviceArea: competitorDiscoveryServiceArea,
        website,
        origin: resolvedLocation.googlePlaceLocation ?? null,
      })
        : [];

    const businessGoogleCandidate = websiteContext?.googleBusinessProfileUrl
      ? null
      : await lookupSingleCompetitor({
          companyName,
          industry: inferredIndustry,
          city: competitorDiscoveryCity ?? resolvedLocation.resolvedCity,
          state: competitorDiscoveryState ?? resolvedLocation.resolvedState,
          website,
          phone: websiteContext?.phone ?? null,
        });

    console.info("Onboarding competitor discovery", {
      companyName,
      website,
      inferredIndustry,
      rawCity: websiteContext?.city ?? null,
      rawState: websiteContext?.state ?? null,
      rawAddress: websiteContext?.address ?? null,
      resolvedAddress: resolvedLocation.resolvedAddress,
      city: competitorDiscoveryCity,
      state: competitorDiscoveryState,
      serviceArea: competitorDiscoveryServiceArea,
      googlePlaceLocation: resolvedLocation.googlePlaceLocation,
      competitors: competitorCandidates.map((candidate) => ({
        name: candidate.name,
        websiteUrl: candidate.websiteUrl,
        formattedAddress: candidate.formattedAddress,
        phone: candidate.phone,
        serviceFocus: candidate.serviceFocus,
        whyItMatters: candidate.whyItMatters,
      })),
    });

    const completion = await openai.chat.completions.parse({
      model: "gpt-4o-2024-08-06",
      messages: [
        {
          role: "system",
          content: `
You are assisting MarketForge onboarding for a local home-service business.

Your job:
- infer likely business profile details from grounded website content
- suggest likely services, service pages, service area, city, state, phone, seasonality
- infer onboarding fields independently from the full supplied website evidence
- preferredServices must represent the full set of materially supported services
  you can identify from the supplied website evidence; do not limit the list based
  on what websiteIntelligence happens to assess
- serviceArea should preserve the most complete, clearly supported service-area
  description available in the supplied evidence rather than unnecessarily
  collapsing a detailed service area into a broader metro label
- use the provided competitor candidates as the primary source for competitor suggestions
- infer whether FAQ content likely exists
- suggest logo URLs if possible
- evaluate the website's authority and discoverability using ONLY the supplied website evidence

Website Intelligence is an additional analytical output.

It must NOT constrain, narrow, replace, or override the normal onboarding
inference for preferredServices, serviceArea, city, state, phone, business
identity, servicePageUrls, or other customer-facing onboarding fields.

First infer the business profile from the supplied evidence.
Separately assess websiteIntelligence from that same evidence.

For websiteIntelligence:

Evaluate the INFORMATION ACTUALLY PRESENT across all supplied homepage text,
fetched page text, titles, URLs, and internal-link evidence.

Do not evaluate the website against an assumed ideal architecture.

Local service business websites vary widely. Important information may exist:
- on dedicated pages
- in sections of a broader services page
- behind anchor links on one page
- directly on the homepage
- inside an FAQ section embedded in another page
- inside about, service-area, educational, or other relevant content

The lack of a dedicated URL must NEVER be treated as proof that content does not exist.

Evaluate these dimensions:

BUSINESS_UNDERSTANDING
- How clearly does the supplied evidence explain who the business is,
  what it does, and the problems/services it handles?
- Strong requires clear, specific business understanding, not merely a business name.

SERVICE_AUTHORITY
- Evaluate the combination of service coverage, service-specific usefulness,
  demonstrated expertise, and clarity across the services the business provides.
- Do not confuse broad service presence with strong service authority.
- A site can clearly offer many services while still having only PARTIAL service
  authority if those services are described with limited depth.
- Judge the actual content, not the number of service pages.
- Several services on one substantive, well-organized page may demonstrate
  meaningful authority.
- Many separate thin pages do not automatically demonstrate strong authority.
- STRONG service authority requires more than clearly identifying what services
  are offered. Across the materially important services, the supplied evidence
  should demonstrate substantial useful information and credible expertise.
- If service presence is strong but most individual services still have meaningful
  opportunities to improve depth, specificity, customer education, or decision
  support, SERVICE_AUTHORITY should usually be PARTIAL rather than STRONG.
- Do not mechanically derive this dimension from serviceCoverage statuses, but
  ensure the overall rating is logically consistent with the service-level evidence.

KNOWLEDGE_DEPTH
- Does the supplied content demonstrate useful expertise beyond ordinary
  descriptions of what the company does?
- Look for explanations of problems, causes, processes, decisions, maintenance,
  risks, tradeoffs, customer questions, misconceptions, alternatives, warning
  signs, expected outcomes, or other information that genuinely teaches the customer.
- FAQ content counts wherever it appears.
- Educational content counts wherever it appears.
- A blog or resource section is NOT required.
- A company can demonstrate meaningful knowledge on a homepage, service page,
  consolidated services page, FAQ section, article, or any other observed content.
- Merely explaining what a service is or why someone might hire the company is
  usually not enough for STRONG knowledge depth.
- STRONG should require repeated evidence of substantive expertise that helps a
  customer understand or make decisions.
- If useful expertise exists but is limited, uneven, brief, or concentrated in
  only a few areas, use PARTIAL.
- The mere presence of a blog, FAQ heading, service list, multiple paragraphs,
  or promotional copy does not make knowledge depth STRONG.

STRUCTURED_CLARITY
- How clearly is the site's information organized so a customer, search engine,
  or AI system can understand the relationships between the business,
  services, expertise, questions, and locations?
- Dedicated pages can strengthen structure when useful, but are not required.
- A well-organized single-page or consolidated service site can still perform well.
- Content that exists but is fragmented, buried, difficult to distinguish,
  overly consolidated, or poorly connected may create a structural gap.
- Judge clarity and organization, not conformity to one preferred website architecture.

LOCAL_RELEVANCE
- Evaluate how clearly the supplied evidence establishes the geographic market
  in which the business operates and the relationship between the business,
  its services, and that market.
- Valid local evidence includes cities, counties, metro areas, regions,
  neighborhoods, service-area descriptions, business locations, and other
  geographically meaningful context.
- Dedicated location pages are NOT required.
- Community involvement, sponsorships, local events, charitable activity,
  neighborhood stories, or detailed local history are NOT required for STRONG
  local relevance.
- Those signals may strengthen credibility when present, but their absence must
  not by itself reduce LOCAL_RELEVANCE.
- STRONG is appropriate when the supplied evidence clearly establishes where
  the business operates and gives sufficiently specific geographic context.
- PARTIAL is appropriate when some geographic context exists but the actual
  operating market, service coverage, or location relationships remain vague,
  incomplete, or difficult to understand.
- WEAK is appropriate when the site provides little usable geographic context
  about where the business operates.
- Use INSUFFICIENT_EVIDENCE when the supplied crawl does not provide enough
  geographic evidence to make a reliable judgment.

TRUST_CREDIBILITY
- Does the supplied evidence contain meaningful credibility signals such as
  experience, licensing, certifications, ownership information, reviews,
  guarantees, team expertise, or other supported trust information?
- Do not invent credentials or infer trust signals that are not present.

CONSISTENCY
- Do business, service, contact, and geographic facts appear internally consistent
  across the supplied evidence?
- Do not penalize the site simply because information is repeated or organized differently.
- If the crawl does not provide enough evidence to determine consistency reliably,
  use INSUFFICIENT_EVIDENCE rather than inventing a conflict.

Status calibration:

STRONG
- A deliberately high bar.
- STRONG means there is little obvious near-term improvement needed for this
  dimension based on the supplied evidence.
- The evidence must be substantive, specific, useful, and sufficiently developed
  rather than merely present.
- Do not use STRONG because the site mentions the subject, has multiple paragraphs,
  uses a dedicated page, has many URLs, or appears professionally designed.
- When meaningful information exists but there is still clear opportunity to improve
  depth, coverage, usefulness, specificity, or organization, use PARTIAL.
- If deciding between STRONG and PARTIAL, prefer PARTIAL unless the evidence clearly
  demonstrates that the stronger rating is deserved.

PARTIAL
- Meaningful content/evidence exists, but important depth, coverage,
  organization, specificity, or clarity can still be improved.

WEAK
- The supplied evidence clearly demonstrates a meaningful deficiency,
  such as sparse content, generic promotional copy, poor organization,
  weak service explanation, or very limited useful knowledge.

INSUFFICIENT_EVIDENCE
- The supplied crawl does not provide enough information to make a reliable judgment.
- Absence from the crawl alone is not proof of absence from the website.

For serviceCoverage:

- Evaluate every service listed in "Services MarketForge inferred from observed
  website links."
- Do not silently omit one of those services.
- You may also include an additional service when the supplied website evidence
  clearly supports it even if it was not present in MarketForge's inferred list.
- If an inferred service appears to overlap substantially with another service,
  still return an assessment for it rather than dropping it; explain the overlap
  in the summary when relevant.
- Evaluate every service separately using the actual supplied evidence.
- Do not award strong presence, depth, or structure merely because MarketForge
  supplied the service name.

presence
- STRONG: the service is clearly offered and materially represented in the supplied evidence
- PARTIAL: the service is clearly offered but receives limited supporting information
- WEAK: the service is only briefly or ambiguously referenced
- INSUFFICIENT_EVIDENCE: the supplied crawl does not support a reliable conclusion

depth
- Evaluate how substantively that specific service is explained.
- Do not confuse clear service presence with depth of expertise.
- WEAK means the service is mostly named, listed, or promoted with little useful explanation.
- PARTIAL means the customer receives meaningful information about the service,
  its purpose, process, considerations, problems solved, or other useful context,
  but clear opportunity remains to deepen the subject.
- STRONG is a high bar and should require substantial service-specific information
  that demonstrates expertise and helps a customer understand important decisions,
  processes, risks, expectations, tradeoffs, or questions related to that service.
- Several ordinary descriptive paragraphs do not automatically justify STRONG.
- If deciding between STRONG and PARTIAL for depth, prefer PARTIAL unless the
  supplied evidence clearly demonstrates substantial service-specific expertise.

structure
- Evaluate how clearly that service information is organized, distinguishable,
  and accessible within the observed site.
- A dedicated page is one possible strong structure, but not the only one.
- A clearly labeled section on a consolidated page can be STRONG when the service
  is easy to identify, navigate to, and understand in context.
- Do not downgrade structure merely because multiple services share one page.
- Do downgrade structure when service information is difficult to distinguish,
  buried, fragmented, poorly labeled, or unclear in relation to other services.
- Judge the actual usability and semantic organization of the observed content,
  not whether the site follows a preferred page architecture.

For strongestGaps:
- return no more than 5 material gaps
- returning zero gaps is allowed when the evidence genuinely supports it
- gaps may be content gaps, depth gaps, service-coverage gaps, structural gaps,
  local-context gaps, trust gaps, or consistency gaps
- a structural gap may exist even when the content itself exists
- every gap must be supported by specific evidence from the supplied crawl
- do not create a LOCAL_RELEVANCE gap merely because the site lacks community
  involvement, sponsorships, local stories, charitable activity, or historical
  content
- a LOCAL_RELEVANCE gap should identify an actual deficiency in geographic
  clarity, service-area understanding, location context, or locally relevant
  service information
- do not generate generic website best practices merely because they are commonly useful
- do not recommend changes such as improving contact consistency, adding FAQs,
  adding service pages, adding location pages, adding a blog, improving internal links,
  or surfacing homepage content unless the supplied evidence actually demonstrates
  that specific deficiency
- do not invent a gap simply because a dimension is PARTIAL
- if a gap cannot be grounded in the supplied evidence, omit it
- do not recommend structure merely for the sake of structure
- prioritize gaps that could materially improve understanding, authority,
  discoverability, customer usefulness, or commercially important service coverage

Grounding rules:
- use ONLY the supplied website evidence
- do not invent pages, facts, credentials, certifications, expertise, services,
  service areas, business history, or URLs
- evidence sourceUrl must be one of the supplied website URLs or null
- internalReadinessScore may be estimated, but MarketForge will recalculate it
  deterministically after this response
- if uncertain, return null rather than inventing specifics
- use the supplied website context first, and only infer conservatively beyond it
- support plumbing, septic, tree service, and HVAC businesses

Important:
- return plain strings for URLs
- if a field is unknown, return null or an empty array
- do not make up a phone number
- do not make up a city or state unless reasonably supported by the website context
- do not invent competitors beyond the candidate list unless absolutely necessary
- prefer the competitor candidates provided below
- this is a suggestion set for user confirmation only

Return structured output only.
          `.trim(),
        },
        {
          role: "user",
          content: `
Company name: ${companyName}
Website: ${website}
Detected industry: ${inferredIndustry}

Grounded website context:
${JSON.stringify(
  {
    normalizedWebsite: websiteContext?.normalizedWebsite ?? website,
    title: websiteContext?.title ?? null,
    metaDescription: websiteContext?.metaDescription ?? null,
    detectedPhone: websiteContext?.phone ?? null,
    detectedEmail: websiteContext?.email ?? null,
    detectedAddress: websiteContext?.address ?? null,
    detectedCity: websiteContext?.city ?? null,
    detectedState: websiteContext?.state ?? null,
    logoCandidates: websiteContext?.logoCandidates ?? [],
    internalLinks:
      websiteContext?.internalLinks.map((link) => ({
        text: link.text,
        href: link.href,
      })) ?? [],
    homepageText: websiteContext?.visibleTextExcerpt ?? null,
    fetchedPages: websiteContext?.fetchedPages ?? [],
  },
  null,
  2
)}

Google Places competitor candidates:
${JSON.stringify(
  competitorCandidates.map((candidate) => ({
    name: candidate.name,
    websiteUrl: candidate.websiteUrl,
    googleBusinessUrl: candidate.googleBusinessUrl,
    formattedAddress: candidate.formattedAddress,
    phone: candidate.phone,
    serviceFocus: candidate.serviceFocus,
    whyItMatters: candidate.whyItMatters,
  })),
  null,
  2
)}

Return best-effort onboarding suggestions for MarketForge.
          `.trim(),
        },
      ],
      response_format: zodResponseFormat(
        onboardingPrefillSchema,
        "marketforge_onboarding_prefill"
      ),
    });

    const parsed = completion.choices[0]?.message.parsed;

    if (!parsed) {
      return {
        success: false,
        error: "AI prefill could not be parsed.",
      };
    }

    const normalizedWebsite =
      cleanString(parsed.website) ??
      websiteContext?.normalizedWebsite ??
      website;

    const mergedServicePageUrls = uniqueStrings([
      ...(parsed.servicePageUrls ?? []).filter(
        (url) => !isObviousNonServicePageUrl(url)
      ),
      ...(websiteContext?.internalLinks
        .filter((link) => {
          if (isObviousNonServicePageUrl(link.href)) {
            return false;
          }

          const combined = `${link.text} ${link.href}`.toLowerCase();

          return (
            combined.includes("service") ||
            combined.includes("repair") ||
            combined.includes("install") ||
            combined.includes("replacement") ||
            combined.includes("replace") ||
            combined.includes("drain") ||
            combined.includes("heater") ||
            combined.includes("water") ||
            combined.includes("faucet") ||
            combined.includes("fixture") ||
            combined.includes("pipe") ||
            combined.includes("sewer") ||
            combined.includes("toilet") ||
            combined.includes("leak") ||
            combined.includes("gas") ||
            combined.includes("camera") ||
            combined.includes("jet") ||
            combined.includes("repipe") ||
            combined.includes("septic") ||
            combined.includes("drain field") ||
            combined.includes("leach field") ||
            combined.includes("grease trap") ||
            combined.includes("riser") ||
            combined.includes("lift pump") ||
            combined.includes("tree") ||
            combined.includes("stump") ||
            combined.includes("arborist") ||
            combined.includes("storm") ||
            combined.includes("pruning") ||
            combined.includes("trimming") ||
            combined.includes("lot clearing") ||
            combined.includes("hvac") ||
            combined.includes("furnace") ||
            combined.includes("cooling") ||
            combined.includes("air conditioning")
          );
        })
        .map((link) => link.href) ?? []),
    ]).slice(0, 20);

    const mergedCompetitors =
  competitorCandidates.length > 0
    ? competitorCandidates.slice(0, 10).map((candidate) => ({
        name: candidate.name,
        websiteUrl: candidate.websiteUrl,
        googleBusinessUrl: candidate.googleBusinessUrl,
        logoUrl: candidate.logoUrl ?? null,
        whyItMatters: candidate.whyItMatters,
        serviceFocus: candidate.serviceFocus.slice(0, 6),
        formattedAddress: candidate.formattedAddress ?? null,
        phone: candidate.phone ?? null,
        placeId: candidate.placeId ?? null,
        rating: candidate.rating ?? null,
        reviewCount: candidate.reviewCount ?? null,
      }))
        : (parsed.competitors ?? []).map((competitor) => ({
            name: competitor.name,
            websiteUrl: cleanString(competitor.websiteUrl),
            googleBusinessUrl: cleanString(competitor.googleBusinessUrl),
            placeId: competitor.placeId ?? null,
            rating: competitor.rating ?? null,
            reviewCount: competitor.reviewCount ?? null,
            logoUrl: cleanString(competitor.logoUrl),
            whyItMatters: competitor.whyItMatters,
            serviceFocus: uniqueStrings(competitor.serviceFocus ?? []).slice(0, 6),
            formattedAddress: cleanString(competitor.formattedAddress),
            phone: cleanString(competitor.phone),
          }));

    const visibilitySignals = inferGoogleVisibilitySignals({
      servicePageUrls: mergedServicePageUrls,
      visibleText: websiteContext?.visibleTextExcerpt ?? "",
      fetchedPagesText:
        websiteContext?.fetchedPages.map((page) => page.visibleTextExcerpt).join(" ") ??
        "",
    });

    const internalLinks = websiteContext?.internalLinks ?? [];
    const fetchedPages = websiteContext?.fetchedPages ?? [];

    const serviceContentUrls = uniqueStrings([
      ...internalLinks
        .filter((link) => {
          const href = link.href.toLowerCase();
          const text = link.text.toLowerCase();
          const combined = `${text} ${href}`;

          if (isObviousNonServicePageUrl(link.href)) {
            return false;
          }

          return (
            href.includes("/service") ||
            combined.includes("tree removal") ||
            combined.includes("tree pruning") ||
            combined.includes("tree trimming") ||
            combined.includes("stump") ||
            combined.includes("storm damage") ||
            combined.includes("risk assessment") ||
            combined.includes("emergency service") ||
            combined.includes("plumbing") ||
            combined.includes("drain") ||
            combined.includes("water heater") ||
            combined.includes("sewer") ||
            combined.includes("septic") ||
            combined.includes("drain field") ||
            combined.includes("hvac") ||
            combined.includes("heating") ||
            combined.includes("cooling") ||
            combined.includes("air conditioning") ||
            combined.includes("furnace")
          );
        })
        .map((link) => link.href),

      ...fetchedPages
        .filter((page) => {
          const href = page.url.toLowerCase();

          return (
            href.includes("/service") &&
            !href.includes("/privacy") &&
            !href.includes("/terms")
          );
        })
        .map((page) => page.url),
    ]).slice(0, 30);

        const dedicatedKnowledgeUrls = uniqueStrings([
          ...internalLinks
            .filter((link) => {
              const combined = `${link.text} ${link.href}`.toLowerCase();

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
            })
            .map((link) => link.href),

          ...fetchedPages
            .filter((page) => {
              const combined = `${page.title ?? ""} ${page.url}`.toLowerCase();

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
            })
            .map((page) => page.url),
        ]).slice(0, 30);

    const dedicatedFaqUrls = uniqueStrings([
      ...internalLinks
        .filter((link) => {
          const combined = `${link.text} ${link.href}`.toLowerCase();

          return (
            combined.includes("/faq") ||
            combined.includes("frequently asked questions")
          );
        })
        .map((link) => link.href),

      ...fetchedPages
        .filter((page) => {
          const combined = `${page.title ?? ""} ${page.url}`.toLowerCase();

          return (
            combined.includes("/faq") ||
            combined.includes("frequently asked questions")
          );
        })
        .map((page) => page.url),
    ]).slice(0, 20);

    const detectedServiceAreaLocations = cleanServiceAreaParts([
      marketAnchor.serviceArea,
      ...regionalServiceAreaSignals,
      resolvedLocation.resolvedCity,
      websiteContext?.city,
      marketAnchor.city,
    ]).slice(0, 50);

    const observedWebsiteSignals: WebsiteIntelligenceObservedSignals = {
      serviceContentUrls,
      dedicatedKnowledgeUrls,
      dedicatedFaqUrls,
      detectedServiceAreaLocations,
      googleBusinessProfileLinkObserved: Boolean(
        websiteContext?.googleBusinessProfileUrl
      ),
    };

    const allowedWebsiteEvidenceUrls = uniqueStrings([
      websiteContext?.normalizedWebsite ?? website,
      ...(websiteContext?.internalLinks.map((link) => link.href) ?? []),
      ...(websiteContext?.fetchedPages.map((page) => page.url) ?? []),
    ]);

    const finalPreferredServices = removeNestedServiceDuplicates(
      mergeAndDedupeServicesForIndustry({
        industry: inferredIndustry,
        groups: [parsed.preferredServices ?? [], inferredServices],
        max: 20,
      })
    );

    const websiteIntelligenceRequiredServices = uniqueStrings([
      ...(parsed.preferredServices ?? []),
      ...inferredServices.filter((inferredService) => {
        const inferredKey = inferredService
          .toLowerCase()
          .replace(/&/g, "and")
          .replace(/[^a-z0-9]+/g, " ")
          .trim();

        return !(parsed.preferredServices ?? []).some((parsedService) => {
          const parsedKey = parsedService
            .toLowerCase()
            .replace(/&/g, "and")
            .replace(/[^a-z0-9]+/g, " ")
            .trim();

          return (
            parsedKey === inferredKey ||
            parsedKey.includes(inferredKey) ||
            inferredKey.includes(parsedKey)
          );
        });
      }),
    ]);

    const websiteIntelligence =
      normalizeWebsiteIntelligenceAssessment({
        assessment: parsed.websiteIntelligence,
        website: normalizedWebsite,
        allowedSourceUrls: allowedWebsiteEvidenceUrls,
        observedSignals: observedWebsiteSignals,
        requiredServices: websiteIntelligenceRequiredServices,
      });

    const finalServiceArea =
      cleanString(parsed.serviceArea) ??
      cleanString(marketAnchor.serviceArea) ??
      null;

    const selectedLogoUrl = selectBestBusinessLogoUrl({
      website: normalizedWebsite,
      logoCandidates: websiteContext?.logoCandidates ?? [],
      aiLogoUrl: cleanString(parsed.logoUrl),
    });

    console.info("[onboarding] logo selection", {
      companyName,
      logoCandidates: websiteContext?.logoCandidates ?? [],
      aiLogoUrl: cleanString(parsed.logoUrl),
      selectedLogoUrl,
    });

    const data: OnboardingPrefillResult = {
      ...parsed,
      website: normalizedWebsite,
      logoUrl: selectBestBusinessLogoUrl({
        website: normalizedWebsite,
        logoCandidates: websiteContext?.logoCandidates ?? [],
        aiLogoUrl: cleanString(parsed.logoUrl),
      }),
      phone: cleanString(parsed.phone) ?? websiteContext?.phone ?? null,
                  googleBusinessProfileUrl:
                    businessGoogleCandidate?.googleBusinessUrl ??
                    cleanString(parsed.googleBusinessProfileUrl) ??
                    cleanString(parsed.googleBusinessUrl) ??
                    resolvedLocation.googleBusinessProfileUrl ??
                    websiteContext?.googleBusinessProfileUrl ??
                    null,
              googlePlaceId:
        businessGoogleCandidate?.placeId ??
        cleanString(parsed.googlePlaceId) ??
        null,
      googleRating:
        typeof businessGoogleCandidate?.rating === "number"
          ? businessGoogleCandidate.rating
          : parsed.googleRating ?? null,
      googleReviewCount:
        typeof businessGoogleCandidate?.reviewCount === "number"
          ? businessGoogleCandidate.reviewCount
          : parsed.googleReviewCount ?? null,
            city:
        marketAnchor.confidence !== "LOW" && marketAnchor.city
          ? marketAnchor.city
          : cleanString(parsed.city) ??
            resolvedLocation.resolvedCity ??
            websiteContext?.city ??
            null,
      state:
        marketAnchor.confidence !== "LOW" && marketAnchor.state
          ? marketAnchor.state
          : cleanString(parsed.state) ??
            resolvedLocation.resolvedState ??
            websiteContext?.state ??
            null,
      serviceArea: finalServiceArea,
      industry: inferredIndustry,
      preferredServices: finalPreferredServices,
      servicePageUrls: mergedServicePageUrls,
      hasFaqContent: visibilitySignals.hasFaqContent,
      hasBlog: visibilitySignals.hasBlog,
      hasGoogleBusinessPage:
        visibilitySignals.hasGoogleBusinessPage ||
        Boolean(
          cleanString(parsed.googleBusinessProfileUrl) ||
            cleanString(parsed.googleBusinessUrl) ||
            resolvedLocation.googleBusinessProfileUrl ||
            websiteContext?.googleBusinessProfileUrl
        ),
      hasServicePages:
        visibilitySignals.hasServicePages || mergedServicePageUrls.length > 0,
      websiteIntelligence,
      competitors: mergedCompetitors,
    };

    console.info(
      "[website-intelligence] onboarding assessment",
      JSON.stringify(
        {
          companyName,
          website: websiteIntelligence.website,
          internalReadinessScore:
            websiteIntelligence.internalReadinessScore,

          dimensions: Object.fromEntries(
            Object.entries(websiteIntelligence.dimensions).map(
              ([key, dimension]) => [
                key,
                {
                  status: dimension.status,
                  summary: dimension.summary,
                  evidence: dimension.evidence,
                },
              ]
            )
          ),

          requiredServices: websiteIntelligenceRequiredServices,

          serviceCoverageCompleteness: {
            requiredCount: websiteIntelligenceRequiredServices.length,
            assessedCount: websiteIntelligence.serviceCoverage.filter(
              (service) =>
                service.presence !== "INSUFFICIENT_EVIDENCE" ||
                service.depth !== "INSUFFICIENT_EVIDENCE" ||
                service.structure !== "INSUFFICIENT_EVIDENCE"
            ).length,
            unresolvedServices: websiteIntelligence.serviceCoverage
              .filter(
                (service) =>
                  service.presence === "INSUFFICIENT_EVIDENCE" &&
                  service.depth === "INSUFFICIENT_EVIDENCE" &&
                  service.structure === "INSUFFICIENT_EVIDENCE"
              )
              .map((service) => service.service),
          },

          serviceCoverage:
            websiteIntelligence.serviceCoverage.map((service) => ({
              service: service.service,
              presence: service.presence,
              depth: service.depth,
              structure: service.structure,
              summary: service.summary,
              evidence: service.evidence,
            })),

          strongestGaps:
            websiteIntelligence.strongestGaps.map((gap) => ({
              type: gap.type,
              service: gap.service,
              summary: gap.summary,
              whyItMatters: gap.whyItMatters,
              evidence: gap.evidence,
            })),

          observedSignals: websiteIntelligence.observedSignals,
        },
        null,
        2
      )
    );

      console.info("[onboarding] customer-facing inference check", {
        companyName,
        parsedPreferredServices: parsed.preferredServices ?? [],
        inferredServices,
        finalPreferredServices,
        parsedServiceArea: cleanString(parsed.serviceArea),
        marketAnchorServiceArea: cleanString(marketAnchor.serviceArea),
        finalServiceArea: data.serviceArea,
      });

      console.info("Final onboarding prefill payload summary", {
      companyName,
      website,
      inferredIndustry,
      finalCity: data.city,
      finalState: data.state,
      finalGoogleBusinessProfileUrl: data.googleBusinessProfileUrl,
      competitorCount: data.competitors.length,
      competitorNames: data.competitors.map((competitor) => competitor.name),
    });

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("generateOnboardingPrefill error", error);

    return {
      success: false,
      error: "Unable to generate onboarding suggestions right now.",
    };
  }
}