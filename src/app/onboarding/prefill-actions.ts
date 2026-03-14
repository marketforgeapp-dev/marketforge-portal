"use server";

import { zodResponseFormat } from "openai/helpers/zod";
import { openai } from "@/lib/openai";
import {
  onboardingPrefillSchema,
  type OnboardingPrefillResult,
} from "@/lib/onboarding-prefill-schema";
import { getWebsitePrefillContext } from "@/lib/website-prefill-context";
import { discoverLocalCompetitors } from "@/lib/google-places-competitors";

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

function faviconFromWebsite(website: string | null): string | null {
  if (!website) return null;

  try {
    const url = new URL(website);
    return `${url.origin}/favicon.ico`;
  } catch {
    return null;
  }
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

function inferIndustryFromCompanyName(companyName: string) {
  const lower = companyName.toLowerCase();

  if (
    lower.includes("hvac") ||
    lower.includes("heating") ||
    lower.includes("cooling")
  ) {
    return "HVAC" as const;
  }

  if (lower.includes("septic")) {
    return "SEPTIC" as const;
  }

  if (lower.includes("tree")) {
    return "TREE_SERVICE" as const;
  }

  return "PLUMBING" as const;
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
    const inferredIndustry = inferIndustryFromCompanyName(companyName);

    const competitorCandidates = await discoverLocalCompetitors({
      companyName,
      industry: inferredIndustry,
      city: websiteContext?.city ?? null,
      state: websiteContext?.state ?? null,
      serviceArea: websiteContext?.address ?? null,
      website,
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

    const fallbackLogo =
      websiteContext?.logoCandidates?.[0] ??
      faviconFromWebsite(normalizedWebsite) ??
    null;

    const mergedServicePageUrls = uniqueStrings([
      ...(parsed.servicePageUrls ?? []),
      ...(websiteContext?.internalLinks
        .filter((link) => {
          const combined = `${link.text} ${link.href}`.toLowerCase();
          return (
            combined.includes("service") ||
            combined.includes("drain") ||
            combined.includes("repair") ||
            combined.includes("water-heater") ||
            combined.includes("water heater") ||
            combined.includes("plumb")
          );
        })
        .map((link) => link.href) ?? []),
    ]).slice(0, 10);

    const mergedCompetitors =
      competitorCandidates.length > 0
        ? competitorCandidates.slice(0, 5).map((candidate) => ({
            name: candidate.name,
            websiteUrl: candidate.websiteUrl,
            googleBusinessUrl: candidate.googleBusinessUrl,
            logoUrl:
              candidate.logoUrl ??
              faviconFromWebsite(candidate.websiteUrl) ??
              null,
            whyItMatters: candidate.whyItMatters,
            serviceFocus: candidate.serviceFocus.slice(0, 6),
          }))
        : (parsed.competitors ?? []).map((competitor) => {
            const competitorWebsite = cleanString(competitor.websiteUrl);

            return {
              ...competitor,
              websiteUrl: competitorWebsite,
              googleBusinessUrl: cleanString(competitor.googleBusinessUrl),
              logoUrl:
                cleanString(competitor.logoUrl) ??
                faviconFromWebsite(competitorWebsite) ??
                null,
              serviceFocus: uniqueStrings(competitor.serviceFocus ?? []).slice(
                0,
                6
              ),
            };
          });

    const data: OnboardingPrefillResult = {
      ...parsed,
      website: normalizedWebsite,
      logoUrl: cleanString(parsed.logoUrl) ?? fallbackLogo ?? null,
      phone: cleanString(parsed.phone) ?? websiteContext?.phone ?? null,
      googleBusinessProfileUrl:
      cleanString(parsed.googleBusinessProfileUrl) ?? null,
      city: cleanString(parsed.city) ?? websiteContext?.city ?? null,
      state: cleanString(parsed.state) ?? websiteContext?.state ?? null,
      serviceArea: cleanString(parsed.serviceArea),
      busySeason: cleanString(parsed.busySeason),
      slowSeason: cleanString(parsed.slowSeason),
      industry: parsed.industry ?? inferredIndustry,
      preferredServices: uniqueStrings(parsed.preferredServices ?? []).slice(
        0,
        8
      ),
      servicePageUrls: mergedServicePageUrls,
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