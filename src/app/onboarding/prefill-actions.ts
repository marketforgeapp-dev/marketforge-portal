"use server";

import { zodResponseFormat } from "openai/helpers/zod";
import { openai } from "@/lib/openai";
import {
  onboardingPrefillSchema,
  type OnboardingPrefillResult,
} from "@/lib/onboarding-prefill-schema";
import { getWebsitePrefillContext } from "@/lib/website-prefill-context";
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

        const resolvedCity = sanitizeLocationValue(websiteContext?.city ?? null, "city");
    const resolvedState = sanitizeLocationValue(websiteContext?.state ?? null, "state");

        console.info("Resolved competitor discovery inputs", {
      companyName,
      inferredIndustry,
      city: resolvedLocation.resolvedCity,
      state: resolvedLocation.resolvedState,
      serviceArea: null,
      website,
      resolvedAddress: resolvedLocation.resolvedAddress,
      googlePlaceLocation: resolvedLocation.googlePlaceLocation,
      citySource: resolvedLocation.citySource,
      stateSource: resolvedLocation.stateSource,
      addressSource: resolvedLocation.addressSource,
    });

    const competitorCandidates = await discoverLocalCompetitors({
      companyName,
      industry: inferredIndustry,
      city: resolvedLocation.resolvedCity,
      state: resolvedLocation.resolvedState,
      serviceArea: null,
      website,
    });

    const businessGoogleCandidate = await lookupSingleCompetitor({
  companyName,
  industry: inferredIndustry,
  city: resolvedLocation.resolvedCity,
  state: resolvedLocation.resolvedState,
  website,
});

    console.info("Onboarding competitor discovery", {
      companyName,
      website,
      inferredIndustry,
      rawCity: websiteContext?.city ?? null,
      rawState: websiteContext?.state ?? null,
      rawAddress: websiteContext?.address ?? null,
      resolvedAddress: resolvedLocation.resolvedAddress,
      city: resolvedLocation.resolvedCity,
      state: resolvedLocation.resolvedState,
      serviceArea: null,
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
        businessGoogleCandidate?.googleBusinessUrl ??
        cleanString(parsed.googleBusinessProfileUrl) ??
        cleanString(parsed.googleBusinessUrl) ??
        resolvedLocation.googleBusinessProfileUrl ??
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
        cleanString(parsed.city) ??
        resolvedLocation.resolvedCity ??
        websiteContext?.city ??
        null,
      state:
        cleanString(parsed.state) ??
        resolvedLocation.resolvedState ??
        websiteContext?.state ??
        null,
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
            resolvedLocation.googleBusinessProfileUrl
        ),
      hasServicePages:
        visibilitySignals.hasServicePages || mergedServicePageUrls.length > 0,
      competitors: mergedCompetitors,
    };

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