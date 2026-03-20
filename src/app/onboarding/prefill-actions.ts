"use server";

import { zodResponseFormat } from "openai/helpers/zod";
import { openai } from "@/lib/openai";
import {
  onboardingPrefillSchema,
  type OnboardingPrefillResult,
} from "@/lib/onboarding-prefill-schema";
import { getWebsitePrefillContext } from "@/lib/website-prefill-context";
import { discoverLocalCompetitors } from "@/lib/google-places-competitors";
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

type GooglePlacesBusinessLookupResponse = {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    websiteUri?: string;
    googleMapsUri?: string;
  }>;
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

async function lookupBusinessGoogleBusinessProfile(input: {
  companyName: string;
  website: string;
  city?: string | null;
  state?: string | null;
}): Promise<string | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  const location = [input.city, input.state].filter(Boolean).join(", ").trim();
  const query = location ? `${input.companyName} ${location}` : input.companyName;

  const response = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.websiteUri,places.googleMapsUri",
      },
      body: JSON.stringify({
        textQuery: query,
        pageSize: 5,
        languageCode: "en",
        regionCode: "US",
      }),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as GooglePlacesBusinessLookupResponse;
  const places = data.places ?? [];
  const businessDomain = normalizeDomain(input.website);

  const matchingPlace =
    places.find((place) => {
      const placeDomain = normalizeDomain(place.websiteUri ?? null);

      if (businessDomain && placeDomain && businessDomain === placeDomain) {
        return true;
      }

      const placeName = place.displayName?.text?.trim().toLowerCase() ?? "";
      const companyName = input.companyName.trim().toLowerCase();

      return placeName === companyName;
    }) ?? null;

  return cleanString(matchingPlace?.googleMapsUri) ?? null;
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

    const competitorCandidates = await discoverLocalCompetitors({
      companyName,
      industry: inferredIndustry,
      city: websiteContext?.city ?? null,
      state: websiteContext?.state ?? null,
      serviceArea: websiteContext?.address ?? null,
      website,
    });

        console.info("Onboarding competitor discovery", {
      companyName,
      website,
      inferredIndustry,
      city: websiteContext?.city ?? null,
      state: websiteContext?.state ?? null,
      serviceArea: websiteContext?.address ?? null,
      competitors: competitorCandidates.map((candidate) => ({
        name: candidate.name,
        websiteUrl: candidate.websiteUrl,
        formattedAddress: candidate.formattedAddress,
        phone: candidate.phone,
        serviceFocus: candidate.serviceFocus,
        whyItMatters: candidate.whyItMatters,
      })),
    });

    const googleBusinessProfileUrl = await lookupBusinessGoogleBusinessProfile({
      companyName,
      website,
      city: websiteContext?.city ?? null,
      state: websiteContext?.state ?? null,
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
- use the provided competitor candidates as the primary source for competitor suggestions
- infer whether FAQ content likely exists
- suggest logo URLs if possible
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
      ...(parsed.servicePageUrls ?? []),
      ...(websiteContext?.internalLinks
        .filter((link) => {
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

    const inferredServices = inferServicesFromLinks({
      industry: inferredIndustry,
      links: websiteContext?.internalLinks ?? [],
    });

        const mergedCompetitors =
      competitorCandidates.length > 0
        ? competitorCandidates.slice(0, 5).map((candidate) => ({
            name: candidate.name,
            websiteUrl: candidate.websiteUrl,
            googleBusinessUrl: candidate.googleBusinessUrl,
            logoUrl: candidate.logoUrl ?? null,
            whyItMatters: candidate.whyItMatters,
            serviceFocus: candidate.serviceFocus.slice(0, 6),
            formattedAddress: candidate.formattedAddress ?? null,
            phone: candidate.phone ?? null,
          }))
        : (parsed.competitors ?? []).map((competitor) => ({
            name: competitor.name,
            websiteUrl: cleanString(competitor.websiteUrl),
            googleBusinessUrl: cleanString(competitor.googleBusinessUrl),
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

    const finalPreferredServices = mergeAndDedupeServicesForIndustry({
      industry: inferredIndustry,
      groups: [parsed.preferredServices ?? [], inferredServices],
      max: 20,
    });

    const data: OnboardingPrefillResult = {
      ...parsed,
      website: normalizedWebsite,
            logoUrl: websiteContext?.logoCandidates?.[0] ?? cleanString(parsed.logoUrl) ?? null,
      phone: cleanString(parsed.phone) ?? websiteContext?.phone ?? null,
      googleBusinessProfileUrl:
        cleanString(parsed.googleBusinessProfileUrl) ??
        cleanString(parsed.googleBusinessUrl) ??
        googleBusinessProfileUrl ??
        null,
      city: cleanString(parsed.city) ?? websiteContext?.city ?? null,
      state: cleanString(parsed.state) ?? websiteContext?.state ?? null,
      serviceArea: cleanString(parsed.serviceArea),
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
            googleBusinessProfileUrl
        ),
      hasServicePages:
        visibilitySignals.hasServicePages || mergedServicePageUrls.length > 0,
      competitors: mergedCompetitors,
    };

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