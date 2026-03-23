type LatLng = {
  latitude: number;
  longitude: number;
};

export type CompetitorCandidate = {
  name: string;
  websiteUrl: string | null;
  googleBusinessUrl: string | null;
  logoUrl: string | null;
  whyItMatters: string;
  serviceFocus: string[];
  formattedAddress: string | null;
  phone: string | null;
  placeId: string | null;
};

export type DiscoverCompetitorsInput = {
  companyName: string;
  industry: "PLUMBING" | "HVAC" | "SEPTIC" | "TREE_SERVICE";
  city?: string | null;
  state?: string | null;
  serviceArea?: string | null;
  website?: string | null;
};

type GooglePlacesTextSearchResponse = {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    websiteUri?: string;
    googleMapsUri?: string;
    nationalPhoneNumber?: string;
    types?: string[];
    primaryType?: string;
    location?: LatLng;
  }>;
};

type GooglePlaceDetailsResponse = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  nationalPhoneNumber?: string;
  types?: string[];
  primaryType?: string;
  location?: LatLng;
};

type RawPlaceCandidate = {
  placeId: string | null;
  name: string;
  websiteUrl: string | null;
  googleBusinessUrl: string | null;
  formattedAddress: string | null;
  phone: string | null;
  types: string[];
  primaryType: string | null;
  location: LatLng | null;
  matchedQuery: string | null;
  queryPass: number;
};

type EnrichedCandidate = CompetitorCandidate & {
  types: string[];
  primaryType: string | null;
  location: LatLng | null;
  matchedQuery: string | null;
  queryPass: number;
};

type IndustryConfig = {
  broadQueries: string[];
  subserviceQueries: string[];
  positiveTerms: string[];
  negativeTerms: string[];
  websiteTerms: string[];
  serviceFocusTerms: Array<{
    label: string;
    terms: string[];
  }>;
};

type SearchPass = {
  pass: number;
  radiusMeters: number;
  queries: string[];
};

type SearchParams = {
  textQuery: string;
  locationBias?: {
    circle: {
      center: LatLng;
      radius: number;
    };
  };
};

const GOOGLE_PLACES_TEXT_SEARCH_URL =
  "https://places.googleapis.com/v1/places:searchText";

const TEXT_SEARCH_PAGE_SIZE = 12;
const MAX_FINAL_COMPETITORS = 10;
const MAX_ENRICH_POOL = 24;

// Very generic words that should NOT drive same-business logic.
const GENERIC_BUSINESS_WORDS = new Set([
  "plumbing",
  "plumber",
  "services",
  "service",
  "heating",
  "cooling",
  "air",
  "conditioning",
  "company",
  "co",
  "corp",
  "corporation",
  "inc",
  "llc",
  "ltd",
  "contractor",
  "contractors",
  "solutions",
  "solution",
  "experts",
  "expert",
  "pros",
  "pro",
  "systems",
  "system",
  "and",
  "the",
  "of",
  "group",
  "home",
  "local",
  "all",
  "one",
  "best",
  "quality",
]);

function cleanString(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function cleanWhitespace(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function slugifyComparable(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeDomain(url: string | null | undefined): string | null {
  const cleaned = cleanString(url);
  if (!cleaned) return null;

  try {
    const normalized =
      cleaned.startsWith("http://") || cleaned.startsWith("https://")
        ? cleaned
        : `https://${cleaned}`;

    const parsed = new URL(normalized);
    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function tokenizeBusinessName(value: string | null | undefined): string[] {
  return (value ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function getDistinctiveBusinessTokens(
  value: string | null | undefined
): string[] {
  return tokenizeBusinessName(value).filter(
    (token) => token.length >= 4 && !GENERIC_BUSINESS_WORDS.has(token)
  );
}

function stringsAreVeryClose(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;

  const minLength = Math.min(a.length, b.length);
  if (minLength < 5) return false;

  let mismatches = 0;
  const maxLength = Math.max(a.length, b.length);
  const min = Math.min(a.length, b.length);

  for (let i = 0; i < min; i += 1) {
    if (a[i] !== b[i]) mismatches += 1;
    if (mismatches > 2) break;
  }

  mismatches += maxLength - min;
  return mismatches <= 2;
}

function hasStrongBrandOverlap(
  candidateName: string,
  companyName: string
): boolean {
  const companyTokens = getDistinctiveBusinessTokens(companyName);
  const candidateTokens = getDistinctiveBusinessTokens(candidateName);

  // Critical: if the name has weak/generic tokens, do NOT collapse it as same business.
  if (companyTokens.length < 2 || candidateTokens.length < 2) {
    return false;
  }

  let overlapCount = 0;

  for (const companyToken of companyTokens) {
    const matched = candidateTokens.some(
      (candidateToken) =>
        candidateToken === companyToken ||
        stringsAreVeryClose(candidateToken, companyToken)
    );

    if (matched) overlapCount += 1;
  }

  const overlapRatio = overlapCount / companyTokens.length;

  // Stricter than before to avoid false positives on generic business names.
  return overlapCount >= 2 && overlapRatio >= 0.66;
}

function isLikelySameBusiness(
  candidateName: string,
  companyName: string,
  candidateWebsite: string | null,
  companyWebsite: string | null
): boolean {
  const candidateDomain = normalizeDomain(candidateWebsite);
  const companyDomain = normalizeDomain(companyWebsite);

  if (candidateDomain && companyDomain && candidateDomain === companyDomain) {
    return true;
  }

  const candidateNameKey = slugifyComparable(candidateName);
  const companyNameKey = slugifyComparable(companyName);

  if (
    candidateNameKey &&
    companyNameKey &&
    (candidateNameKey === companyNameKey ||
      candidateNameKey.includes(companyNameKey) ||
      companyNameKey.includes(candidateNameKey))
  ) {
    return true;
  }

  return hasStrongBrandOverlap(candidateName, companyName);
}

function faviconFromWebsite(website: string | null): string | null {
  if (!website) return null;

  try {
    const url = new URL(
      website.startsWith("http://") || website.startsWith("https://")
        ? website
        : `https://${website}`
    );

    return `${url.origin}/favicon.ico`;
  } catch {
    return null;
  }
}

function absolutizeUrl(raw: string, base: string): string | null {
  try {
    return new URL(raw, base).toString();
  } catch {
    return null;
  }
}

function isFiniteLatLng(value: LatLng | null | undefined): value is LatLng {
  return Boolean(
    value &&
      Number.isFinite(value.latitude) &&
      Number.isFinite(value.longitude)
  );
}

function haversineMiles(a: LatLng, b: LatLng): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;

  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);

  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(h));
}

function getLocationStrings(input: DiscoverCompetitorsInput) {
  const city = cleanWhitespace(input.city ?? "");
  const state = cleanWhitespace(input.state ?? "");
  const cityState = [city, state].filter(Boolean).join(", ").trim();
  const serviceArea = cleanWhitespace(input.serviceArea ?? "");

  return {
    city,
    state,
    cityState,
    serviceArea,
  };
}

function getIndustryConfig(
  industry: DiscoverCompetitorsInput["industry"]
): IndustryConfig {
  if (industry === "PLUMBING") {
    return {
      broadQueries: [
        "plumber",
        "plumbing company",
        "local plumber",
        "emergency plumber",
      ],
      subserviceQueries: [
        "drain cleaning",
        "water heater service",
        "tankless water heater",
        "sewer line repair",
        "leak repair",
      ],
      positiveTerms: [
        "plumber",
        "plumbing",
        "drain",
        "water heater",
        "tankless",
        "leak",
        "sewer",
        "repipe",
        "fixture",
        "toilet",
        "garbage disposal",
      ],
      negativeTerms: [
        "septic only",
        "tree service",
        "arborist",
        "landscaping",
        "roofing",
      ],
      websiteTerms: [
        "plumbing",
        "plumber",
        "water heater",
        "drain",
        "sewer",
        "leak",
      ],
      serviceFocusTerms: [
        { label: "Drain cleaning", terms: ["drain cleaning", "drain unclogging"] },
        { label: "Hydro jetting", terms: ["hydro jet", "jetting"] },
        { label: "Water heater service", terms: ["water heater"] },
        { label: "Tankless water heater", terms: ["tankless"] },
        { label: "Leak repair", terms: ["leak repair", "leak detection"] },
        { label: "Sewer line service", terms: ["sewer line"] },
        { label: "Emergency plumbing", terms: ["emergency plumber", "24/7 plumber"] },
      ],
    };
  }

  if (industry === "SEPTIC") {
    return {
      broadQueries: [
        "septic service",
        "septic company",
        "local septic company",
        "septic pumping company",
      ],
      subserviceQueries: [
        "septic pumping",
        "septic tank pumping",
        "septic inspection",
        "drain field repair",
        "septic installation",
        "lift pump service",
      ],
      positiveTerms: [
        "septic",
        "septic tank",
        "septic pumping",
        "drain field",
        "leach field",
        "lift pump",
        "waste",
        "sewer",
      ],
      negativeTerms: [
        "tree service",
        "arborist",
        "hvac",
        "air conditioning",
        "landscaping",
        "water heater",
        "drain cleaning",
      ],
      websiteTerms: [
        "septic",
        "septic tank",
        "drain field",
        "leach field",
        "septic pumping",
        "septic inspection",
        "lift pump",
      ],
      serviceFocusTerms: [
        { label: "Septic tank pumping", terms: ["septic pumping", "tank pumping"] },
        { label: "Septic system inspection", terms: ["septic inspection", "system inspection"] },
        { label: "Drain field repair", terms: ["drain field", "leach field"] },
        { label: "Lift pump service", terms: ["lift pump"] },
        { label: "Septic system installation", terms: ["septic installation", "system installation"] },
        { label: "Riser & lid installation", terms: ["riser", "lid installation"] },
      ],
    };
  }

  if (industry === "TREE_SERVICE") {
    return {
      broadQueries: [
        "tree service",
        "tree company",
        "tree removal company",
        "local tree service",
      ],
      subserviceQueries: [
        "tree removal",
        "tree trimming",
        "stump grinding",
        "arborist",
        "lot clearing",
        "storm cleanup tree service",
      ],
      positiveTerms: [
        "tree",
        "tree removal",
        "tree trimming",
        "pruning",
        "stump",
        "arborist",
        "lot clearing",
        "storm cleanup",
      ],
      negativeTerms: [
        "septic",
        "plumber",
        "hvac",
        "heating",
        "air conditioning",
      ],
      websiteTerms: [
        "tree service",
        "tree removal",
        "tree trimming",
        "pruning",
        "stump grinding",
        "arborist",
        "lot clearing",
      ],
      serviceFocusTerms: [
        { label: "Tree removal", terms: ["tree removal"] },
        { label: "Pruning & trimming", terms: ["tree trimming", "pruning"] },
        { label: "Stump grinding", terms: ["stump grinding", "stump removal"] },
        { label: "Emergency storm service", terms: ["storm cleanup", "storm damage"] },
        { label: "Lot clearing", terms: ["lot clearing", "land clearing"] },
        { label: "Arborist consultations", terms: ["arborist"] },
      ],
    };
  }

  return {
    broadQueries: [
      "hvac contractor",
      "hvac company",
      "air conditioning repair",
      "heating and cooling company",
    ],
    subserviceQueries: [
      "ac repair",
      "heating repair",
      "furnace repair",
      "hvac maintenance",
      "heat pump service",
      "system replacement",
    ],
    positiveTerms: [
      "hvac",
      "air conditioning",
      "ac repair",
      "heating",
      "cooling",
      "furnace",
      "heat pump",
      "mini split",
      "ductless",
    ],
    negativeTerms: [
      "tree service",
      "arborist",
      "septic",
      "drain field",
      "plumbing only",
    ],
    websiteTerms: [
      "hvac",
      "air conditioning",
      "heating",
      "cooling",
      "furnace",
      "heat pump",
    ],
    serviceFocusTerms: [
      { label: "AC repair", terms: ["ac repair", "air conditioning repair"] },
      { label: "Heating repair", terms: ["heating repair", "furnace repair"] },
      { label: "HVAC maintenance", terms: ["maintenance", "tune up"] },
      { label: "System replacement", terms: ["replacement", "new system"] },
      { label: "Heat pump service", terms: ["heat pump"] },
      { label: "Ductless mini-split service", terms: ["ductless", "mini split"] },
    ],
  };
}

function buildSearchPasses(input: DiscoverCompetitorsInput): SearchPass[] {
  const config = getIndustryConfig(input.industry);
  const location = getLocationStrings(input);

  const localAnchor = location.cityState || location.serviceArea || location.state;
  const broaderAnchor = location.serviceArea || location.cityState || location.state;

  const localQueries = new Set<string>();
  const expandedQueries = new Set<string>();
  const fallbackQueries = new Set<string>();

  if (localAnchor) {
    for (const broad of config.broadQueries) {
      localQueries.add(`${broad} in ${localAnchor}`);
      localQueries.add(`${broad} ${localAnchor}`);
      localQueries.add(`best ${broad} in ${localAnchor}`);
    }

    for (const subservice of config.subserviceQueries) {
      localQueries.add(`${subservice} in ${localAnchor}`);
      localQueries.add(`${subservice} ${localAnchor}`);
    }
  }

  if (broaderAnchor) {
    for (const broad of config.broadQueries) {
      expandedQueries.add(`${broad} near ${broaderAnchor}`);
      expandedQueries.add(`top ${broad} near ${broaderAnchor}`);
    }

    for (const subservice of config.subserviceQueries) {
      expandedQueries.add(`${subservice} near ${broaderAnchor}`);
      expandedQueries.add(`local ${subservice} ${broaderAnchor}`);
    }
  }

  for (const broad of config.broadQueries) {
    fallbackQueries.add(`${broad} near me`);
  }

  for (const subservice of config.subserviceQueries.slice(0, 4)) {
    fallbackQueries.add(`${subservice} near me`);
  }

  return [
    { pass: 1, radiusMeters: 40234, queries: Array.from(localQueries).slice(0, 12) }, // ~25 mi
    { pass: 2, radiusMeters: 50000, queries: Array.from(expandedQueries).slice(0, 12) }, // Max allowed by Google Places
    { pass: 3, radiusMeters: 50000, queries: Array.from(fallbackQueries).slice(0, 8) }, // Max allowed by Google Places
  ].filter((entry) => entry.queries.length > 0);
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getTextEvidenceBlob(params: {
  candidateName?: string | null;
  matchedQuery?: string | null;
  websiteText?: string | null;
  types?: string[];
  primaryType?: string | null;
}): string {
  return [
    params.candidateName ?? "",
    params.matchedQuery ?? "",
    params.websiteText ?? "",
    ...(params.types ?? []),
    params.primaryType ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

function getIndustryEvidenceScore(params: {
  industry: DiscoverCompetitorsInput["industry"];
  candidateName: string;
  matchedQuery: string | null;
  websiteText?: string | null;
  types?: string[];
  primaryType?: string | null;
}): number {
  const config = getIndustryConfig(params.industry);
  const blob = getTextEvidenceBlob({
    candidateName: params.candidateName,
    matchedQuery: params.matchedQuery,
    websiteText: params.websiteText,
    types: params.types,
    primaryType: params.primaryType,
  });

  let score = 0;

  for (const term of config.positiveTerms) {
    if (blob.includes(term)) score += 10;
  }

  for (const term of config.websiteTerms) {
    if (blob.includes(term)) score += 12;
  }

  for (const term of config.negativeTerms) {
    if (blob.includes(term)) score -= 18;
  }

  // Critical: septic must not drift into pure plumbing.
  if (params.industry === "SEPTIC" && blob.includes("plumber")) {
    score -= 20;
  }

  return score;
}

function inferServiceFocusFromWebsite(params: {
  industry: DiscoverCompetitorsInput["industry"];
  website: string | null;
  html: string | null;
}): string[] {
  const config = getIndustryConfig(params.industry);
  const text = stripHtml(params.html ?? "").toLowerCase();
  const found = new Set<string>();

  for (const item of config.serviceFocusTerms) {
    if (item.terms.some((term) => text.includes(term))) {
      found.add(item.label);
    }
  }

  return Array.from(found).slice(0, 8);
}

function inferServiceFocusFromTypes(
  types: string[] = [],
  industry: DiscoverCompetitorsInput["industry"]
): string[] {
  const joined = types.join(" ").toLowerCase();

  if (industry === "PLUMBING") {
    if (joined.includes("plumber")) return ["General plumbing"];
    if (joined.includes("drain")) return ["Drain cleaning"];
    return ["Plumbing service"];
  }

  if (industry === "SEPTIC") {
    if (joined.includes("septic")) return ["Septic service"];
    if (joined.includes("sewer")) return ["Septic / sewer service"];
    return ["Septic service"];
  }

  if (industry === "TREE_SERVICE") {
    if (joined.includes("tree")) return ["Tree service"];
    if (joined.includes("arbor")) return ["Arborist service"];
    return ["Tree service"];
  }

  if (joined.includes("hvac")) return ["HVAC service"];
  if (joined.includes("heating")) return ["Heating service"];
  if (joined.includes("air_conditioning") || joined.includes("air conditioning")) {
    return ["Air conditioning service"];
  }

  return ["HVAC service"];
}

function buildCompetitorSummary(params: {
  industry: DiscoverCompetitorsInput["industry"];
  formattedAddress: string | null;
  phone: string | null;
  websiteUrl: string | null;
  serviceFocus: string[];
}): string {
  const industryLabel =
    params.industry === "PLUMBING"
      ? "Plumbing company"
      : params.industry === "HVAC"
        ? "HVAC company"
        : params.industry === "SEPTIC"
          ? "Septic service company"
          : "Tree service company";

  const parts: string[] = [];

  if (params.formattedAddress) {
    parts.push(`${industryLabel} at ${params.formattedAddress}.`);
  } else {
    parts.push(`${industryLabel} in the local market.`);
  }

  if (params.serviceFocus.length > 0) {
    parts.push(
      `Service signals: ${params.serviceFocus.slice(0, 4).join(", ")}.`
    );
  }

  if (params.phone) {
    parts.push("Phone contact available.");
  }

  if (params.websiteUrl) {
    parts.push("Website available.");
  }

  return parts.join(" ");
}

function locationMatchesEnough(
  formattedAddress: string | null,
  city: string | null | undefined,
  state: string | null | undefined
): boolean {
  const address = (formattedAddress ?? "").toLowerCase();
  const cityLower = cleanWhitespace(city ?? "").toLowerCase();
  const stateLower = cleanWhitespace(state ?? "").toLowerCase();

  if (!address) return false;
  if (cityLower && address.includes(cityLower)) return true;
  if (stateLower && address.includes(stateLower)) return true;

  return false;
}

function isSameCity(
  formattedAddress: string | null,
  city: string | null | undefined
): boolean {
  const address = (formattedAddress ?? "").toLowerCase();
  const cityLower = cleanWhitespace(city ?? "").toLowerCase();

  if (!address || !cityLower) return false;
  return address.includes(cityLower);
}

function looksLikeBadgeOrTrustAsset(url: string): boolean {
  const lower = url.toLowerCase();

  return (
    lower.includes("bbb") ||
    lower.includes("better-business-bureau") ||
    lower.includes("accredited-business") ||
    lower.includes("badge") ||
    lower.includes("seal") ||
    lower.includes("award") ||
    lower.includes("review-badge") ||
    lower.includes("google-review") ||
    lower.includes("stars") ||
    lower.includes("rating") ||
    lower.includes("testimonial") ||
    lower.includes("veteran") ||
    lower.includes("veteren") ||
    lower.includes("owned") ||
    lower.includes("american-flag") ||
    lower.includes("flag") ||
    lower.includes("patriot") ||
    lower.includes("usa")
  );
}

function looksLikeDecorativeAsset(url: string): boolean {
  const lower = url.toLowerCase();

  return (
    lower.includes("hero") ||
    lower.includes("banner") ||
    lower.includes("background") ||
    lower.includes("bg-") ||
    lower.includes("bg_") ||
    lower.includes("wave") ||
    lower.includes("truck") ||
    lower.includes("team") ||
    lower.includes("review") ||
    lower.includes("testimonial") ||
    lower.includes("gallery") ||
    lower.includes("slider") ||
    lower.includes("slide") ||
    lower.includes("header-image") ||
    lower.includes("cover") ||
    lower.includes("section") ||
    lower.includes("feature") ||
    lower.includes("featured-image") ||
    lower.includes("service-area") ||
    lower.includes("near-") ||
    lower.includes("stock") ||
    lower.includes("shutterstock")
  );
}

function looksLikeVideoOrMediaAsset(url: string): boolean {
  const lower = url.toLowerCase();

  return (
    lower.includes("/video") ||
    lower.includes("/videos") ||
    lower.includes("youtube") ||
    lower.includes("vimeo") ||
    lower.includes(".mp4") ||
    lower.includes(".mov") ||
    lower.includes(".webm")
  );
}

function looksLikeIconAsset(url: string): boolean {
  const lower = url.toLowerCase();

  return (
    lower.includes("favicon") ||
    lower.includes("apple-touch-icon") ||
    lower.includes("site-icon") ||
    lower.includes("mask-icon") ||
    lower.includes("/icon-") ||
    lower.includes("/icons/") ||
    lower.includes("sprite")
  );
}

function looksLikeServiceImage(url: string): boolean {
  const lower = url.toLowerCase();

  return (
    lower.includes("septic") ||
    lower.includes("tree") ||
    lower.includes("stump") ||
    lower.includes("water-heater") ||
    lower.includes("drain") ||
    lower.includes("trimming") ||
    lower.includes("pruning") ||
    lower.includes("furnace") ||
    lower.includes("ac-repair") ||
    lower.includes("heating") ||
    lower.includes("cooling") ||
    lower.includes("general-plumbing") ||
    lower.includes("service-") ||
    lower.includes("residential") ||
    lower.includes("commercial")
  );
}

function extractAttribute(tag: string, attribute: string): string | null {
  const match = tag.match(new RegExp(`\\s${attribute}=["']([^"']+)["']`, "i"));
  return cleanString(match?.[1] ?? null);
}

function scoreLogoCandidate(params: {
  url: string;
  tagContext: string;
  brandName: string;
  isMetaCandidate?: boolean;
}): number {
  const lowerUrl = params.url.toLowerCase();
  const brandTokens = getDistinctiveBusinessTokens(params.brandName);
  const altText = extractAttribute(params.tagContext, "alt")?.toLowerCase() ?? "";
  const classText = extractAttribute(params.tagContext, "class")?.toLowerCase() ?? "";
  const idText = extractAttribute(params.tagContext, "id")?.toLowerCase() ?? "";
  const combinedText = `${altText} ${classText} ${idText} ${lowerUrl}`.toLowerCase();

  if (looksLikeVideoOrMediaAsset(lowerUrl)) return -150;
  if (looksLikeBadgeOrTrustAsset(lowerUrl)) return -120;
  if (looksLikeDecorativeAsset(lowerUrl)) return -100;
  if (looksLikeIconAsset(lowerUrl)) return -40;

  let score = 0;

  if (combinedText.includes("logo")) score += 90;
  if (combinedText.includes("brand")) score += 35;
  if (combinedText.includes("site-logo")) score += 25;
  if (combinedText.includes("header-logo")) score += 20;
  if (combinedText.includes("navbar")) score += 12;

  for (const token of brandTokens) {
    if (token.length >= 4 && combinedText.includes(token)) {
      score += 18;
    }
  }

  if (lowerUrl.endsWith(".svg")) score += 30;
  if (lowerUrl.endsWith(".png")) score += 16;
  if (lowerUrl.endsWith(".webp")) score += 5;
  if (lowerUrl.endsWith(".jpg") || lowerUrl.endsWith(".jpeg")) score -= 18;

  if (looksLikeServiceImage(lowerUrl)) score -= 45;
  if (params.isMetaCandidate) score -= 30;
  if (lowerUrl.includes("og:image")) score -= 20;
  if (lowerUrl.includes("featured")) score -= 24;
  if (lowerUrl.includes("blob")) score += 6;

  const widthMatch = params.tagContext.match(/\swidth=["'](\d+)["']/i);
  const heightMatch = params.tagContext.match(/\sheight=["'](\d+)["']/i);

  const width = widthMatch ? Number(widthMatch[1]) : null;
  const height = heightMatch ? Number(heightMatch[1]) : null;

  if (width && height) {
    if (width >= 700 && height >= 350) score -= 30;
    if (height > width * 1.45) score -= 18;
    if (width <= 450 && height <= 220) score += 10;
  }

  return score;
}

async function fetchWebsiteHtml(website: string | null): Promise<string | null> {
  if (!website) return null;

  try {
    const normalized =
      website.startsWith("http://") || website.startsWith("https://")
        ? website
        : `https://${website}`;

    const response = await fetch(normalized, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; MarketForgeCompetitorBot/1.0; +https://marketforgeapp.com)",
      },
      redirect: "follow",
      cache: "no-store",
    });

    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

function extractLinkIconCandidates(html: string, website: string): string[] {
  const candidates = new Set<string>();
  const matches = [
    ...html.matchAll(/<link\b[^>]*rel=["'][^"']*icon[^"']*["'][^>]*>/gi),
  ];

  for (const match of matches) {
    const tag = match[0] ?? "";
    const href = extractAttribute(tag, "href");
    const url = href ? absolutizeUrl(href, website) : null;
    if (url) candidates.add(url);
  }

  return Array.from(candidates);
}

async function extractHomepageLogoCandidate(params: {
  website: string | null;
  brandName: string;
}): Promise<string | null> {
  const html = await fetchWebsiteHtml(params.website);
  if (!html || !params.website) return null;

  const candidates = new Map<string, number>();

  const addCandidate = (
    rawUrl: string | null,
    tagContext: string,
    isMetaCandidate = false
  ) => {
    const url = rawUrl ? absolutizeUrl(rawUrl, params.website as string) : null;
    if (!url) return;

    const score = scoreLogoCandidate({
      url,
      tagContext,
      brandName: params.brandName,
      isMetaCandidate,
    });

    const existing = candidates.get(url) ?? Number.NEGATIVE_INFINITY;
    if (score > existing) {
      candidates.set(url, score);
    }
  };

  const imgTagMatches = [...html.matchAll(/<img\b[^>]*>/gi)];

  for (const match of imgTagMatches) {
    const tag = match[0] ?? "";
    const src = extractAttribute(tag, "src") ?? extractAttribute(tag, "data-src");
    if (src) addCandidate(src, tag, false);

    const srcset = extractAttribute(tag, "srcset");
    if (srcset) {
      const firstSrcsetUrl = srcset.split(",")[0]?.trim().split(" ")[0] ?? null;
      addCandidate(firstSrcsetUrl, tag, false);
    }
  }

  const metaMatches = [
    ...html.matchAll(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/gi
    ),
    ...html.matchAll(
      /<meta[^>]+name=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/gi
    ),
    ...html.matchAll(
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/gi
    ),
  ];

  for (const match of metaMatches) {
    addCandidate(match[1] ?? null, `<meta content="${match[1] ?? ""}" />`, true);
  }

  const sorted = Array.from(candidates.entries()).sort((a, b) => b[1] - a[1]);
  const best = sorted[0];

  if (best && best[1] >= 70) {
    return best[0];
  }

  const iconCandidates = extractLinkIconCandidates(html, params.website);
  return iconCandidates[0] ?? faviconFromWebsite(params.website);
}

async function searchText(
  apiKey: string,
  params: SearchParams
): Promise<GooglePlacesTextSearchResponse["places"]> {
  const response = await fetch(GOOGLE_PLACES_TEXT_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.websiteUri,places.googleMapsUri,places.nationalPhoneNumber,places.types,places.primaryType,places.location",
    },
    body: JSON.stringify({
      textQuery: params.textQuery,
      pageSize: TEXT_SEARCH_PAGE_SIZE,
      languageCode: "en",
      regionCode: "US",
      ...(params.locationBias ? { locationBias: params.locationBias } : {}),
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Google Places Text Search failed (${response.status}): ${errorText}`
    );
  }

  const data = (await response.json()) as GooglePlacesTextSearchResponse;
  return data.places ?? [];
}

async function getPlaceDetails(
  apiKey: string,
  placeId: string
): Promise<GooglePlaceDetailsResponse | null> {
  const response = await fetch(
    `https://places.googleapis.com/v1/places/${placeId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "id,displayName,formattedAddress,websiteUri,googleMapsUri,nationalPhoneNumber,types,primaryType,location",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as GooglePlaceDetailsResponse;
}

async function resolveSearchOrigin(
  apiKey: string,
  input: DiscoverCompetitorsInput
): Promise<LatLng | null> {
  const location = getLocationStrings(input);

  const queries = [
    location.cityState,
    location.serviceArea,
    [location.city, location.state].filter(Boolean).join(" ").trim(),
    location.state,
  ].filter(Boolean) as string[];

  for (const textQuery of queries) {
    try {
      const places = await searchText(apiKey, { textQuery });
      const locationCandidate = places?.find((place) => isFiniteLatLng(place.location))
        ?.location;

      if (isFiniteLatLng(locationCandidate)) {
        return locationCandidate;
      }
    } catch (error) {
      console.error("Search origin lookup failed", { textQuery, error });
    }
  }

  return null;
}

function shouldKeepRawCandidate(params: {
  candidate: RawPlaceCandidate;
  input: DiscoverCompetitorsInput;
  origin: LatLng | null;
}): boolean {
  const { candidate, input, origin } = params;
  const evidenceScore = getIndustryEvidenceScore({
    industry: input.industry,
    candidateName: candidate.name,
    matchedQuery: candidate.matchedQuery,
    websiteText: null,
    types: candidate.types,
    primaryType: candidate.primaryType,
  });

  if (isLikelySameBusiness(candidate.name, input.companyName, candidate.websiteUrl, input.website ?? null)) {
    return false;
  }

  if (evidenceScore < 5) {
    return false;
  }

  if (origin && isFiniteLatLng(candidate.location)) {
    const distance = haversineMiles(origin, candidate.location);
    if (distance > 120) return false;
  }

  return true;
}

function scoreRawCandidate(params: {
  candidate: RawPlaceCandidate;
  input: DiscoverCompetitorsInput;
  origin: LatLng | null;
}): number {
  const { candidate, input, origin } = params;

  let score = 0;

  score += getIndustryEvidenceScore({
    industry: input.industry,
    candidateName: candidate.name,
    matchedQuery: candidate.matchedQuery,
    websiteText: null,
    types: candidate.types,
    primaryType: candidate.primaryType,
  });

  if (candidate.websiteUrl) score += 10;
  if (candidate.formattedAddress) score += 8;
  if (candidate.phone) score += 4;
  if (candidate.googleBusinessUrl) score += 3;

  if (isSameCity(candidate.formattedAddress, input.city ?? null)) {
    score += 18;
  } else if (
    locationMatchesEnough(
      candidate.formattedAddress,
      input.city ?? null,
      input.state ?? null
    )
  ) {
    score += 8;
  }

  if (origin && isFiniteLatLng(candidate.location)) {
    const distance = haversineMiles(origin, candidate.location);

    if (distance <= 10) score += 16;
    else if (distance <= 25) score += 10;
    else if (distance <= 50) score += 4;
    else if (distance > 90) score -= 10;
  }

  if (candidate.queryPass === 1) score += 8;
  if (candidate.queryPass === 2) score += 3;

  return score;
}

function scoreEnrichedCandidate(params: {
  candidate: EnrichedCandidate;
  input: DiscoverCompetitorsInput;
  origin: LatLng | null;
  websiteText: string | null;
}): number {
  const { candidate, input, origin, websiteText } = params;

  let score = 0;

  score += getIndustryEvidenceScore({
    industry: input.industry,
    candidateName: candidate.name,
    matchedQuery: candidate.matchedQuery,
    websiteText,
    types: candidate.types,
    primaryType: candidate.primaryType,
  });

  if (candidate.websiteUrl) score += 10;
  if (candidate.formattedAddress) score += 8;
  if (candidate.phone) score += 4;
  if (candidate.googleBusinessUrl) score += 3;
  if (candidate.logoUrl) score += 3;

  if (candidate.serviceFocus.length > 0) {
    score += Math.min(candidate.serviceFocus.length * 4, 16);
  }

  if (isSameCity(candidate.formattedAddress, input.city ?? null)) {
    score += 24;
  } else if (
    locationMatchesEnough(
      candidate.formattedAddress,
      input.city ?? null,
      input.state ?? null
    )
  ) {
    score += 10;
  }

  if (origin && isFiniteLatLng(candidate.location)) {
    const distance = haversineMiles(origin, candidate.location);

    if (distance <= 10) score += 18;
    else if (distance <= 25) score += 12;
    else if (distance <= 50) score += 4;
    else if (distance > 90) score -= 12;
  }

  if (candidate.queryPass === 1) score += 6;
  if (candidate.queryPass === 2) score += 2;

  if (isLikelySameBusiness(candidate.name, input.companyName, candidate.websiteUrl, input.website ?? null)) {
    score -= 100;
  }

  return score;
}

function dedupeKeyForCandidate(
  candidate: Pick<
    RawPlaceCandidate | EnrichedCandidate,
    "name" | "websiteUrl" | "formattedAddress"
  >
): string {
  return (
    normalizeDomain(candidate.websiteUrl) ??
    `${slugifyComparable(candidate.name)}::${candidate.formattedAddress ?? "no-address"}`
  );
}

export async function lookupSingleCompetitorCore(input: {
  companyName: string;
  industry: "PLUMBING" | "HVAC" | "SEPTIC" | "TREE_SERVICE";
  city?: string | null;
  state?: string | null;
  website?: string | null;
}): Promise<CompetitorCandidate | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  const location = [input.city, input.state].filter(Boolean).join(" ").trim();
  const textQuery = location
    ? `${input.companyName} ${location}`
    : input.companyName;

  let places: GooglePlacesTextSearchResponse["places"];

  try {
    places = await searchText(apiKey, { textQuery });
  } catch (error) {
    console.error("Single competitor lookup failed", {
      companyName: input.companyName,
      error,
    });
    return null;
  }

  if (!places || places.length === 0) {
    return null;
  }

  const targetDomain = normalizeDomain(input.website);
  const targetName = slugifyComparable(input.companyName);

  const sortedPlaces = [...places].sort((a, b) => {
    const aHasWebsite = Boolean(cleanString(a.websiteUri));
    const bHasWebsite = Boolean(cleanString(b.websiteUri));

    if (aHasWebsite !== bHasWebsite) {
      return aHasWebsite ? -1 : 1;
    }

    return 0;
  });

  const bestPlace =
    sortedPlaces.find((place) => {
      const candidateWebsite = cleanString(place.websiteUri);
      const candidateDomain = normalizeDomain(candidateWebsite);
      const candidateName = slugifyComparable(place.displayName?.text ?? null);

      if (targetDomain && candidateDomain && targetDomain === candidateDomain) {
        return true;
      }

      if (!targetName || !candidateName) {
        return false;
      }

      return (
        candidateName === targetName ||
        candidateName.includes(targetName) ||
        targetName.includes(candidateName)
      );
    }) ?? sortedPlaces[0];

  const placeId = cleanString(bestPlace.id);
  const details = placeId ? await getPlaceDetails(apiKey, placeId) : null;

  const websiteUrl =
    cleanString(details?.websiteUri) ?? cleanString(bestPlace.websiteUri);
  const googleBusinessUrl =
    cleanString(details?.googleMapsUri) ?? cleanString(bestPlace.googleMapsUri);
  const formattedAddress =
    cleanString(details?.formattedAddress) ??
    cleanString(bestPlace.formattedAddress);
  const phone =
    cleanString(details?.nationalPhoneNumber) ??
    cleanString(bestPlace.nationalPhoneNumber);
  const html = await fetchWebsiteHtml(websiteUrl);
  const types = details?.types ?? bestPlace.types ?? [];

  const serviceFocusFromWebsite = inferServiceFocusFromWebsite({
    industry: input.industry,
    website: websiteUrl,
    html,
  });

  const serviceFocus =
    serviceFocusFromWebsite.length > 0
      ? serviceFocusFromWebsite
      : inferServiceFocusFromTypes(types, input.industry);

  const logoUrl = await extractHomepageLogoCandidate({
    website: websiteUrl,
    brandName:
      cleanString(details?.displayName?.text) ??
      cleanString(bestPlace.displayName?.text) ??
      input.companyName,
  });

  return {
    name:
      cleanString(details?.displayName?.text) ??
      cleanString(bestPlace.displayName?.text) ??
      input.companyName,
    websiteUrl,
    googleBusinessUrl,
    logoUrl: logoUrl ?? faviconFromWebsite(websiteUrl),
    whyItMatters: buildCompetitorSummary({
      industry: input.industry,
      formattedAddress,
      phone,
      websiteUrl,
      serviceFocus,
    }),
    serviceFocus,
    formattedAddress,
    phone,
    placeId: placeId ?? null,
  };
}

export async function discoverLocalCompetitorsCore(
  input: DiscoverCompetitorsInput
): Promise<CompetitorCandidate[]> {
  console.info("Google Maps key fingerprint", {
    keyPrefix: process.env.GOOGLE_MAPS_API_KEY?.slice(0,12) ?? null,
  })
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.warn(
      "GOOGLE_MAPS_API_KEY is missing. Skipping Google Places competitor discovery."
    );
    return [];
  }

  const origin = await resolveSearchOrigin(apiKey, input);
  const passes = buildSearchPasses(input);
  console.info("Competitor engine fignerprint", {
      version: "2026-03-23-local-bias-radis-50000",
  })

  const collected = new Map<string, RawPlaceCandidate>();
  const rejectionStats = {
    sameBusiness: 0,
    weakIndustry: 0,
    tooFar: 0,
  };

  for (const searchPass of passes) {
    for (const query of searchPass.queries) {
      let places: GooglePlacesTextSearchResponse["places"];

      try {
        places = await searchText(apiKey, {
          textQuery: query,
          ...(origin
            ? {
                locationBias: {
                  circle: {
                    center: origin,
                    radius: searchPass.radiusMeters,
                  },
                },
              }
            : {}),
        });
      } catch (error) {
        console.error("Google Places text search failed", { query, error });
        continue;
      }

      if (!places || places.length === 0) {
        continue;
      }

      for (const place of places) {
        const placeId = cleanString(place.id);
        const name = cleanString(place.displayName?.text);

        if (!name) continue;

        const websiteUrl = cleanString(place.websiteUri);
        const googleBusinessUrl = cleanString(place.googleMapsUri);
        const formattedAddress = cleanString(place.formattedAddress);
        const phone = cleanString(place.nationalPhoneNumber);
        const types = place.types ?? [];
        const primaryType = cleanString(place.primaryType);
        const locationValue = isFiniteLatLng(place.location) ? place.location : null;

        if (
          isLikelySameBusiness(
            name,
            input.companyName,
            websiteUrl,
            input.website ?? null
          )
        ) {
          rejectionStats.sameBusiness += 1;
          continue;
        }

        const candidate: RawPlaceCandidate = {
          placeId,
          name,
          websiteUrl,
          googleBusinessUrl,
          formattedAddress,
          phone,
          types,
          primaryType,
          location: locationValue,
          matchedQuery: query,
          queryPass: searchPass.pass,
        };

        if (!shouldKeepRawCandidate({ candidate, input, origin })) {
          const rawScore = getIndustryEvidenceScore({
            industry: input.industry,
            candidateName: candidate.name,
            matchedQuery: candidate.matchedQuery,
            websiteText: null,
            types: candidate.types,
            primaryType: candidate.primaryType,
          });

          if (rawScore < 5) rejectionStats.weakIndustry += 1;
          else rejectionStats.tooFar += 1;

          continue;
        }

        const key =
          placeId ??
          `${slugifyComparable(name)}::${normalizeDomain(websiteUrl) ?? "no-domain"}::${
            formattedAddress ?? "no-address"
          }`;

        const existing = collected.get(key);

        if (!existing) {
          collected.set(key, candidate);
          continue;
        }

        const existingScore = scoreRawCandidate({
          candidate: existing,
          input,
          origin,
        });
        const nextScore = scoreRawCandidate({
          candidate,
          input,
          origin,
        });

        if (nextScore > existingScore) {
          collected.set(key, candidate);
        }
      }
    }
  }

  const rankedBaseCandidates = Array.from(collected.values())
    .map((candidate) => ({
      candidate,
      score: scoreRawCandidate({
        candidate,
        input,
        origin,
      }),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_ENRICH_POOL)
    .map(({ candidate }) => candidate);

  const enriched = await Promise.all(
    rankedBaseCandidates.map(async (candidate) => {
      const details =
        candidate.placeId ? await getPlaceDetails(apiKey, candidate.placeId) : null;

      const websiteUrl =
        cleanString(details?.websiteUri) ?? candidate.websiteUrl;
      const googleBusinessUrl =
        cleanString(details?.googleMapsUri) ?? candidate.googleBusinessUrl;
      const formattedAddress =
        cleanString(details?.formattedAddress) ?? candidate.formattedAddress;
      const phone =
        cleanString(details?.nationalPhoneNumber) ?? candidate.phone;
      const types = details?.types ?? candidate.types;
      const primaryType = cleanString(details?.primaryType) ?? candidate.primaryType;
      const locationValue =
        details?.location && isFiniteLatLng(details.location)
          ? details.location
          : candidate.location;

      const html = await fetchWebsiteHtml(websiteUrl);

      const serviceFocusFromWebsite = inferServiceFocusFromWebsite({
        industry: input.industry,
        website: websiteUrl,
        html,
      });

      const serviceFocus =
        serviceFocusFromWebsite.length > 0
          ? serviceFocusFromWebsite
          : inferServiceFocusFromTypes(types, input.industry);

      const resolvedName =
        cleanString(details?.displayName?.text) ?? candidate.name;

      const logoUrl = await extractHomepageLogoCandidate({
        website: websiteUrl,
        brandName: resolvedName,
      });

      return {
        name: resolvedName,
        websiteUrl,
        googleBusinessUrl,
        logoUrl: logoUrl ?? faviconFromWebsite(websiteUrl),
        whyItMatters: buildCompetitorSummary({
          industry: input.industry,
          formattedAddress,
          phone,
          websiteUrl,
          serviceFocus,
        }),
        serviceFocus,
        formattedAddress,
        phone,
        placeId: candidate.placeId,
        location: locationValue,
        types,
        primaryType,
        matchedQuery: candidate.matchedQuery,
        queryPass: candidate.queryPass,
      } satisfies EnrichedCandidate;
    })
  );

  const deduped = new Map<string, EnrichedCandidate>();

  for (const candidate of enriched) {
    if (
      isLikelySameBusiness(
        candidate.name,
        input.companyName,
        candidate.websiteUrl,
        input.website ?? null
      )
    ) {
      continue;
    }

    const key = dedupeKeyForCandidate(candidate);
    const existing = deduped.get(key);

    if (!existing) {
      deduped.set(key, candidate);
      continue;
    }

    const existingScore = scoreEnrichedCandidate({
      candidate: existing,
      input,
      origin,
      websiteText: null,
    });

    const nextScore = scoreEnrichedCandidate({
      candidate,
      input,
      origin,
      websiteText: null,
    });

    if (nextScore > existingScore) {
      deduped.set(key, candidate);
    }
  }

  const finalCandidates = Array.from(deduped.values())
    .map((candidate) => ({
      candidate,
      score: scoreEnrichedCandidate({
        candidate,
        input,
        origin,
        websiteText: null,
      }),
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ candidate }) => candidate)
    .slice(0, MAX_FINAL_COMPETITORS)
    .map<CompetitorCandidate>((candidate) => ({
      name: candidate.name,
      websiteUrl: candidate.websiteUrl,
      googleBusinessUrl: candidate.googleBusinessUrl,
      logoUrl: candidate.logoUrl,
      whyItMatters: candidate.whyItMatters,
      serviceFocus: candidate.serviceFocus,
      formattedAddress: candidate.formattedAddress,
      phone: candidate.phone,
      placeId: candidate.placeId,
    }));

  console.info("Competitor discovery diagnostics", {
    companyName: input.companyName,
    industry: input.industry,
    city: input.city ?? null,
    state: input.state ?? null,
    serviceArea: input.serviceArea ?? null,
    origin,
    queryPasses: passes.map((pass) => ({
      pass: pass.pass,
      radiusMeters: pass.radiusMeters,
      queryCount: pass.queries.length,
      queries: pass.queries,
    })),
    collectedCount: collected.size,
    enrichPoolCount: rankedBaseCandidates.length,
    finalCount: finalCandidates.length,
    rejectionStats,
    finalCompetitors: finalCandidates.map((candidate) => ({
      name: candidate.name,
      websiteUrl: candidate.websiteUrl,
      formattedAddress: candidate.formattedAddress,
      phone: candidate.phone,
      serviceFocus: candidate.serviceFocus,
    })),
  });

  return finalCandidates;
}