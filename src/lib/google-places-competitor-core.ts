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
  rating: number | null;
  reviewCount: number | null;
};

export type DiscoverCompetitorsInput = {
  companyName: string;
  industry: "PLUMBING" | "HVAC" | "SEPTIC" | "TREE_SERVICE";
  city?: string | null;
  state?: string | null;
  serviceArea?: string | null;
  website?: string | null;
  origin?: LatLng | null;
};

export type LookupBusinessInput = {
  companyName: string;
  industry: "PLUMBING" | "HVAC" | "SEPTIC" | "TREE_SERVICE";
  city?: string | null;
  state?: string | null;
  website?: string | null;
  phone?: string | null;
};

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  nationalPhoneNumber?: string;
  types?: string[];
  primaryType?: string;
  location?: LatLng;
  rating?: number;
  userRatingCount?: number;
};

type GooglePlacesTextSearchResponse = {
  places?: GooglePlace[];
};

type GooglePlaceDetailsResponse = GooglePlace;

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
  rating: number | null;
  reviewCount: number | null;
  matchedQueries: string[];
  matchedServiceQueries: string[];
  matchedAnchors: string[];
  queryPasses: number[];
  hitCount: number;
};

type EnrichedCandidate = CompetitorCandidate & {
  types: string[];
  primaryType: string | null;
  location: LatLng | null;
  matchedQueries: string[];
  matchedServiceQueries: string[];
  matchedAnchors: string[];
  queryPasses: number[];
  hitCount: number;
  debugReasons: string[];
};

const GOOGLE_PLACES_TEXT_SEARCH_URL =
  "https://places.googleapis.com/v1/places:searchText";

const TEXT_SEARCH_PAGE_SIZE = 10;
const MAX_FINAL_COMPETITORS = 10;
const MAX_DISCOVERY_TEXT_SEARCHES = 12;
const MAX_ENRICH_POOL = 12;
const MAX_LOOKUP_TEXT_SEARCHES = 5;
const MAX_LOOKUP_ENRICH_POOL = 5;
const MAX_WEBSITE_FETCHES = 12;

const GENERIC_BUSINESS_WORDS = new Set([
  "24",
  "247",
  "and",
  "best",
  "company",
  "co",
  "contractor",
  "contractors",
  "corp",
  "corporation",
  "expert",
  "experts",
  "group",
  "home",
  "inc",
  "llc",
  "local",
  "ltd",
  "one",
  "pro",
  "pros",
  "quality",
  "service",
  "services",
  "solution",
  "solutions",
  "system",
  "systems",
  "the",
  "of",
  "all",
  "air",
  "conditioning",
  "cooling",
  "heating",
  "plumber",
  "plumbing",
  "septic",
  "tree",
  "trees",
  "hvac",
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

function normalizePhoneDigits(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

function formatPhoneForQuery(value: string | null | undefined): string | null {
  const digits = normalizePhoneDigits(value);

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  return digits.length >= 7 ? digits : null;
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

function normalizeDomainStem(url: string | null | undefined): string | null {
  const domain = normalizeDomain(url);
  if (!domain) return null;

  const parts = domain.split(".").filter(Boolean);
  if (parts.length === 0) return null;

  return parts[0]
    ?.replace(/[^a-z0-9]/gi, "")
    .toLowerCase()
    .trim() || null;
}

function normalizeCompetitorAddress(value: string | null | undefined): string {
  return slugifyComparable(value);
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

function getDistinctiveBusinessTokens(value: string | null | undefined): string[] {
  return tokenizeBusinessName(value).filter(
    (token) => token.length >= 4 && !GENERIC_BUSINESS_WORDS.has(token)
  );
}

function stringsAreVeryClose(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 5 && b.length >= 5 && (a.includes(b) || b.includes(a))) {
    return true;
  }

  const minLength = Math.min(a.length, b.length);
  if (minLength < 6) return false;

  let mismatches = 0;
  const maxLength = Math.max(a.length, b.length);

  for (let i = 0; i < minLength; i += 1) {
    if (a[i] !== b[i]) mismatches += 1;
    if (mismatches > 2) return false;
  }

  mismatches += maxLength - minLength;
  return mismatches <= 2;
}

function hasStrongBrandOverlap(candidateName: string, companyName: string): boolean {
  const companyTokens = getDistinctiveBusinessTokens(companyName);
  const candidateTokens = getDistinctiveBusinessTokens(candidateName);

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

  return overlapCount >= 2 && overlapCount / companyTokens.length >= 0.66;
}

function isStrongBusinessNameCandidate(
  candidateName: string,
  companyName: string
): boolean {
  const candidateSlug = slugifyComparable(candidateName);
  const companySlug = slugifyComparable(companyName);

  if (!candidateSlug || !companySlug) return false;
  if (candidateSlug === companySlug) return true;
  if (hasStrongBrandOverlap(candidateName, companyName)) return true;

  const companyTokens = getDistinctiveBusinessTokens(companyName);
  const candidateTokens = getDistinctiveBusinessTokens(candidateName);

  if (companyTokens.length === 0 || candidateTokens.length === 0) {
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

  return overlapCount >= 2;
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

  if (candidateNameKey && companyNameKey && candidateNameKey === companyNameKey) {
    return true;
  }

  return hasStrongBrandOverlap(candidateName, companyName);
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

  return { city, state, cityState, serviceArea };
}

function uniqueNonEmptyStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const cleaned = cleanWhitespace(value);
    const key = cleaned.toLowerCase();

    if (!cleaned || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(cleaned);
  }

  return result;
}

function isGarbageServiceAreaToken(value: string): boolean {
  const lower = value.toLowerCase().trim();

  if (!lower) return true;
  if (lower.length < 2) return true;
  if (lower.length > 60) return true;
  if (/^[a-z]{2}$/i.test(lower)) return true;
  if (/^\d+$/.test(lower)) return true;

  const garbageTokens = new Set([
    "about",
    "about us",
    "blog",
    "careers",
    "commercial",
    "contact",
    "contact us",
    "coupons",
    "emergency",
    "financing",
    "home",
    "privacy",
    "residential",
    "reviews",
    "schedule",
    "service",
    "services",
    "specials",
    "terms",
    "testimonials",
  ]);

  return garbageTokens.has(lower);
}

function splitServiceAreaAnchors(value: string | null | undefined): string[] {
  const cleaned = cleanWhitespace(value ?? "");

  if (!cleaned) {
    return [];
  }

  return cleaned
    .replace(/\bwe serve\b/gi, ",")
    .replace(/\bserving\b/gi, ",")
    .replace(/\bservice areas?\b/gi, ",")
    .replace(/\bareas served\b/gi, ",")
    .replace(/\bincluding\b/gi, ",")
    .replace(/\band\b/gi, ",")
    .split(/[,;|]+/)
    .map((part) => cleanWhitespace(part))
    .filter((part) => part.length > 0)
    .filter((part) => !isGarbageServiceAreaToken(part));
}

function isRegionalMarketAnchor(value: string): boolean {
  const lower = value.toLowerCase();

  return (
    lower.includes("metro") ||
    lower.includes("greater") ||
    lower.includes("county") ||
    lower.includes("counties") ||
    lower.includes("north georgia") ||
    lower.includes("south georgia") ||
    lower.includes("middle georgia") ||
    lower.includes("central georgia") ||
    lower.includes("atlanta area") ||
    lower.includes("north atlanta") ||
    lower.includes("south atlanta")
  );
}

function formatMarketAnchor(value: string, state: string): string | null {
  const cleaned = cleanWhitespace(value);

  if (!cleaned) {
    return null;
  }

  const hasState = Boolean(state && new RegExp(`\\b${state}\\b`, "i").test(cleaned));

  if (isRegionalMarketAnchor(cleaned)) {
    if (cleaned.toLowerCase().includes("county") && state && !hasState) {
      return `${cleaned}, ${state}`;
    }

    return cleaned;
  }

  if (state && !hasState) {
    return `${cleaned}, ${state}`;
  }

  return cleaned;
}

function getMarketAnchors(input: DiscoverCompetitorsInput): string[] {
  const location = getLocationStrings(input);
  const anchors: string[] = [];

  if (location.cityState) {
    anchors.push(location.cityState);
  }

  for (const part of splitServiceAreaAnchors(location.serviceArea)) {
    const formatted = formatMarketAnchor(part, location.state);

    if (formatted) {
      anchors.push(formatted);
    }
  }

  if (anchors.length === 0 && location.serviceArea) {
    anchors.push(location.serviceArea);
  }

  if (anchors.length === 0 && location.state) {
    anchors.push(location.state);
  }

  return uniqueNonEmptyStrings(anchors).slice(0, 4);
}

function getIndustryLabel(industry: DiscoverCompetitorsInput["industry"]): string {
  if (industry === "PLUMBING") return "Plumbing company";
  if (industry === "HVAC") return "HVAC company";
  if (industry === "SEPTIC") return "Septic service company";
  return "Tree service company";
}

function getIndustryConfig(
  industry: DiscoverCompetitorsInput["industry"]
): IndustryConfig {
  if (industry === "PLUMBING") {
    return {
      broadQueries: ["plumber", "plumbing company", "emergency plumber"],
      subserviceQueries: [
        "drain cleaning",
        "water heater service",
        "sewer line repair",
        "leak repair",
      ],
      positiveTerms: [
        "plumber",
        "plumbers",
        "plumb",
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
        "tree service",
        "arborist",
        "landscaping",
        "roofing",
        "septic only",
      ],
      websiteTerms: ["plumbing", "plumber", "water heater", "drain", "sewer", "leak"],
      serviceFocusTerms: [
        { label: "Drain cleaning", terms: ["drain cleaning", "drain unclogging", "clogged drain"] },
        { label: "Hydro jetting", terms: ["hydro jet", "hydrojet", "jetting"] },
        { label: "Water heater service", terms: ["water heater"] },
        { label: "Tankless water heater", terms: ["tankless"] },
        { label: "Leak repair", terms: ["leak repair", "leak detection"] },
        { label: "Sewer line service", terms: ["sewer line", "sewer repair"] },
        { label: "Emergency plumbing", terms: ["emergency plumber", "24/7 plumber", "24 hour plumber"] },
      ],
    };
  }

  if (industry === "SEPTIC") {
    return {
      broadQueries: ["septic service", "septic company", "septic pumping company"],
      subserviceQueries: [
        "septic pumping",
        "septic tank pumping",
        "septic inspection",
        "drain field repair",
        "septic installation",
      ],
      positiveTerms: [
        "septic",
        "septic tank",
        "septic pumping",
        "drain field",
        "leach field",
        "lift pump",
        "wastewater",
      ],
      negativeTerms: [
        "tree service",
        "arborist",
        "hvac",
        "air conditioning",
        "landscaping",
        "water heater",
        "plumbing company",
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
      broadQueries: ["tree service", "tree company", "tree removal company"],
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
        "tree expert",
      ],
      negativeTerms: [
        "septic",
        "plumber",
        "hvac",
        "heating",
        "air conditioning",
        "landscap",
        "lawn care",
        "lawn service",
        "yard maintenance",
        "grass cutting",
        "fertilization",
        "weed control",
        "mulch",
        "sod",
        "irrigation",
        "hardscape",
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
    broadQueries: ["hvac contractor", "hvac company", "heating and cooling company"],
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
    negativeTerms: ["tree service", "arborist", "septic", "drain field", "plumbing only"],
    websiteTerms: ["hvac", "air conditioning", "heating", "cooling", "furnace", "heat pump"],
    serviceFocusTerms: [
      { label: "AC repair", terms: ["ac repair", "air conditioning repair"] },
      { label: "Heating repair", terms: ["heating repair", "furnace repair"] },
      { label: "HVAC maintenance", terms: ["maintenance", "tune up", "tune-up"] },
      { label: "System replacement", terms: ["replacement", "new system", "installation"] },
      { label: "Heat pump service", terms: ["heat pump"] },
      { label: "Ductless mini-split service", terms: ["ductless", "mini split", "mini-split"] },
    ],
  };
}

function inferAnchorFromQuery(query: string, input: DiscoverCompetitorsInput): string | null {
  const location = getLocationStrings(input);
  const queryLower = query.toLowerCase();

  if (location.cityState && queryLower.includes(location.cityState.toLowerCase())) {
    return location.cityState;
  }

  if (location.serviceArea && queryLower.includes(location.serviceArea.toLowerCase())) {
    return location.serviceArea;
  }

  if (location.city && queryLower.includes(location.city.toLowerCase())) {
    return location.city;
  }

  if (location.state && queryLower.includes(location.state.toLowerCase())) {
    return location.state;
  }

  return null;
}

function isServiceQuery(query: string, industry: DiscoverCompetitorsInput["industry"]): boolean {
  const config = getIndustryConfig(industry);
  const lower = query.toLowerCase();

  return config.subserviceQueries.some((service) => lower.includes(service.toLowerCase()));
}

function buildSearchPasses(input: DiscoverCompetitorsInput): SearchPass[] {
  const config = getIndustryConfig(input.industry);
  const anchors = getMarketAnchors(input);

  const primaryAnchor = anchors[0] ?? null;
  const secondaryAnchors = anchors.slice(1, 4);

  const primaryQueries: string[] = [];
  const marketQueries: string[] = [];
  const fallbackQueries: string[] = [];

  const addUnique = (target: string[], value: string | null | undefined) => {
    const cleaned = cleanWhitespace(value ?? "");

    if (!cleaned) {
      return;
    }

    if (!target.includes(cleaned)) {
      target.push(cleaned);
    }
  };

  if (primaryAnchor) {
    addUnique(primaryQueries, `${config.broadQueries[0]} in ${primaryAnchor}`);
    addUnique(primaryQueries, `${config.broadQueries[1] ?? config.broadQueries[0]} in ${primaryAnchor}`);
    addUnique(primaryQueries, `best ${config.broadQueries[0]} in ${primaryAnchor}`);
    addUnique(primaryQueries, `${config.subserviceQueries[0]} in ${primaryAnchor}`);
  }

  for (const anchor of secondaryAnchors) {
    addUnique(marketQueries, `${config.broadQueries[0]} in ${anchor}`);
    addUnique(marketQueries, `${config.broadQueries[1] ?? config.broadQueries[0]} in ${anchor}`);
    addUnique(marketQueries, `best ${config.broadQueries[0]} in ${anchor}`);
  }

  if (secondaryAnchors.length === 0 && primaryAnchor) {
    addUnique(marketQueries, `top ${config.broadQueries[0]} near ${primaryAnchor}`);
    addUnique(marketQueries, `${config.subserviceQueries[1] ?? config.subserviceQueries[0]} near ${primaryAnchor}`);
    addUnique(marketQueries, `${config.subserviceQueries[2] ?? config.subserviceQueries[0]} near ${primaryAnchor}`);
  }

  if (!primaryAnchor) {
    for (const broad of config.broadQueries.slice(0, 3)) {
      addUnique(fallbackQueries, `${broad} near me`);
    }

    for (const subservice of config.subserviceQueries.slice(0, 3)) {
      addUnique(fallbackQueries, `${subservice} near me`);
    }
  }

  return [
    {
      pass: 1,
      radiusMeters: 50000,
      queries: primaryQueries.slice(0, 4),
    },
    {
      pass: 2,
      radiusMeters: 50000,
      queries: marketQueries.slice(0, 8),
    },
    {
      pass: 3,
      radiusMeters: 50000,
      queries: fallbackQueries.slice(0, 6),
    },
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
  matchedQueries?: string[];
  websiteText?: string | null;
  types?: string[];
  primaryType?: string | null;
}): string {
  return [
    params.candidateName ?? "",
    ...(params.matchedQueries ?? []),
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
  matchedQueries?: string[];
  websiteText?: string | null;
  types?: string[];
  primaryType?: string | null;
}): number {
  const config = getIndustryConfig(params.industry);
  const blob = getTextEvidenceBlob({
    candidateName: params.candidateName,
    matchedQueries: params.matchedQueries,
    websiteText: params.websiteText,
    types: params.types,
    primaryType: params.primaryType,
  });

  let score = 0;

  for (const term of config.positiveTerms) {
    if (blob.includes(term)) score += 8;
  }

  for (const term of config.websiteTerms) {
    if (blob.includes(term)) score += 10;
  }

  for (const term of config.negativeTerms) {
    if (blob.includes(term)) score -= 18;
  }

  if (params.industry === "SEPTIC" && /\bplumber\b/.test(blob) && !blob.includes("septic")) {
    score -= 25;
  }

  if (
    params.industry === "TREE_SERVICE" &&
    (blob.includes("landscap") ||
      blob.includes("lawn care") ||
      blob.includes("lawn service") ||
      blob.includes("yard maintenance") ||
      blob.includes("grass cutting") ||
      blob.includes("fertilization") ||
      blob.includes("weed control") ||
      blob.includes("irrigation") ||
      blob.includes("hardscape"))
  ) {
    score -= 40;
  }

  return score;
}

function inferServiceFocusFromWebsite(params: {
  industry: DiscoverCompetitorsInput["industry"];
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

function inferServiceFocusFromEvidence(params: {
  industry: DiscoverCompetitorsInput["industry"];
  types?: string[];
  matchedQueries?: string[];
  websiteText?: string | null;
}): string[] {
  const config = getIndustryConfig(params.industry);
  const blob = [
    ...(params.types ?? []),
    ...(params.matchedQueries ?? []),
    params.websiteText ?? "",
  ]
    .join(" ")
    .toLowerCase();
  const found = new Set<string>();

  for (const item of config.serviceFocusTerms) {
    if (item.terms.some((term) => blob.includes(term))) {
      found.add(item.label);
    }
  }

  if (found.size > 0) return Array.from(found).slice(0, 8);

  if (params.industry === "PLUMBING") return ["Plumbing service"];
  if (params.industry === "HVAC") return ["HVAC service"];
  if (params.industry === "SEPTIC") return ["Septic service"];
  return ["Tree service"];
}

function buildCompetitorSummary(params: {
  industry: DiscoverCompetitorsInput["industry"];
  formattedAddress: string | null;
  phone: string | null;
  websiteUrl: string | null;
  serviceFocus: string[];
  matchedQueries?: string[];
  reviewCount?: number | null;
  rating?: number | null;
}): string {
  const parts: string[] = [];
  const industryLabel = getIndustryLabel(params.industry);

  if (params.formattedAddress) {
    parts.push(`${industryLabel} at ${params.formattedAddress}.`);
  } else {
    parts.push(`${industryLabel} in the relevant service market.`);
  }

  if (params.serviceFocus.length > 0) {
    parts.push(`Service signals: ${params.serviceFocus.slice(0, 4).join(", ")}.`);
  }

  if (typeof params.reviewCount === "number" && params.reviewCount > 0) {
    parts.push(`Google reputation signal: ${params.reviewCount.toLocaleString()} reviews${typeof params.rating === "number" ? ` at ${params.rating.toFixed(1)} stars` : ""}.`);
  }

  if ((params.matchedQueries ?? []).length > 1) {
    parts.push(`Appeared across ${params.matchedQueries?.length ?? 0} relevant discovery searches.`);
  }

  if (params.phone) parts.push("Phone contact available.");
  if (params.websiteUrl) parts.push("Website available.");

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

function extractAttribute(tag: string, attribute: string): string | null {
  const match = tag.match(new RegExp(`\\s${attribute}=["']([^"']+)["']`, "i"));
  return cleanString(match?.[1] ?? null);
}

function looksLikeBadgeOrTrustAsset(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes("bbb") ||
    lower.includes("better-business-bureau") ||
    lower.includes("badge") ||
    lower.includes("seal") ||
    lower.includes("award") ||
    lower.includes("review-badge") ||
    lower.includes("google-review") ||
    lower.includes("stars") ||
    lower.includes("rating") ||
    lower.includes("testimonial") ||
    lower.includes("veteran") ||
    lower.includes("american-flag") ||
    lower.includes("patriot")
  );
}

function looksLikeDecorativeAsset(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes("hero") ||
    lower.includes("banner") ||
    lower.includes("background") ||
    lower.includes("bg-") ||
    lower.includes("truck") ||
    lower.includes("team") ||
    lower.includes("gallery") ||
    lower.includes("slider") ||
    lower.includes("slide") ||
    lower.includes("header-image") ||
    lower.includes("cover") ||
    lower.includes("featured-image") ||
    lower.includes("service-area") ||
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
    if (token.length >= 4 && combinedText.includes(token)) score += 18;
  }

  if (lowerUrl.endsWith(".svg")) score += 30;
  if (lowerUrl.endsWith(".png")) score += 16;
  if (lowerUrl.endsWith(".webp")) score += 5;
  if (lowerUrl.endsWith(".jpg") || lowerUrl.endsWith(".jpeg")) score -= 18;
  if (looksLikeServiceImage(lowerUrl)) score -= 45;
  if (params.isMetaCandidate) score -= 30;
  if (lowerUrl.includes("featured")) score -= 24;
  if (lowerUrl.includes("blob")) score += 6;

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
  html?: string | null;
}): Promise<string | null> {
  const html = params.html ?? (await fetchWebsiteHtml(params.website));
  if (!html || !params.website) return faviconFromWebsite(params.website);

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
    if (score > existing) candidates.set(url, score);
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
    ...html.matchAll(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/gi),
    ...html.matchAll(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/gi),
  ];

  for (const match of metaMatches) {
    addCandidate(match[1] ?? null, `<meta content="${match[1] ?? ""}" />`, true);
  }

  const sorted = Array.from(candidates.entries()).sort((a, b) => b[1] - a[1]);
  const best = sorted[0];

  if (best && best[1] >= 70) return best[0];

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
        "places.id,places.displayName,places.formattedAddress,places.websiteUri,places.googleMapsUri,places.nationalPhoneNumber,places.types,places.primaryType,places.location,places.rating,places.userRatingCount",
    },
    body: JSON.stringify({
      textQuery: params.textQuery,
      pageSize: TEXT_SEARCH_PAGE_SIZE,
      languageCode: "en",
      regionCode: "US",
      includePureServiceAreaBusinesses: true,
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
          "id,displayName,formattedAddress,websiteUri,googleMapsUri,nationalPhoneNumber,types,primaryType,location,rating,userRatingCount",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) return null;
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
  ].filter((value): value is string => Boolean(value));

  for (const textQuery of queries.slice(0, 2)) {
    try {
      const places = await searchText(apiKey, { textQuery });
      const locationCandidate = places?.find((place) => isFiniteLatLng(place.location))?.location;
      if (isFiniteLatLng(locationCandidate)) return locationCandidate;
    } catch (error) {
      console.error("Search origin lookup failed", { textQuery, error });
    }
  }

  return null;
}

function getCompetitorProminenceScore(candidate: {
  rating: number | null;
  reviewCount: number | null;
}): number {
  const reviewCount = candidate.reviewCount ?? 0;
  const rating = candidate.rating ?? 0;

  let score = 0;

  if (reviewCount > 0) {
    score += Math.min(75, Math.log10(reviewCount + 1) * 28);
  }

  if (rating > 0) {
    score += Math.max(0, rating - 3.5) * 10;
  }

  if (reviewCount >= 250 && rating >= 4.6) {
    score += 10;
  } else if (reviewCount >= 100 && rating >= 4.6) {
    score += 5;
  }

  return score;
}

function getMarketVisibilityScore(candidate: {
  hitCount: number;
  matchedQueries: string[];
  matchedServiceQueries: string[];
  matchedAnchors: string[];
}): number {
  let score = 0;

  // Repeated appearances matter, but they should not let small hyper-local
  // companies outrank more prominent consumer alternatives.
  score += Math.min(candidate.hitCount, 3) * 4;
  score += Math.min(candidate.matchedQueries.length, 3) * 2;
  score += Math.min(candidate.matchedServiceQueries.length, 2) * 4;

  // Cross-market visibility is more valuable than repeating across many
  // similar searches in the same small city.
  score += Math.min(candidate.matchedAnchors.length, 3) * 8;

  return score;
}

function getDistanceScore(params: {
  candidate: { formattedAddress: string | null; location: LatLng | null };
  input: DiscoverCompetitorsInput;
  origin: LatLng | null;
}): number {
  const { candidate, input, origin } = params;
  let score = 0;

  if (isSameCity(candidate.formattedAddress, input.city ?? null)) score += 8;
  else if (locationMatchesEnough(candidate.formattedAddress, input.city, input.state)) score += 6;

  if (origin && isFiniteLatLng(candidate.location)) {
    const distance = haversineMiles(origin, candidate.location);
    if (distance <= 25) score += 5;
    else if (distance <= 50) score += 3;
    else if (distance > 90) score -= 14;
  }

  return score;
}

function shouldKeepRawCandidate(params: {
  candidate: RawPlaceCandidate;
  input: DiscoverCompetitorsInput;
  origin: LatLng | null;
}): boolean {
  const { candidate, input, origin } = params;

  if (isLikelySameBusiness(candidate.name, input.companyName, candidate.websiteUrl, input.website ?? null)) {
    return false;
  }

  const evidenceScore = getIndustryEvidenceScore({
    industry: input.industry,
    candidateName: candidate.name,
    matchedQueries: candidate.matchedQueries,
    types: candidate.types,
    primaryType: candidate.primaryType,
  });

  if (evidenceScore < 4) return false;

  if (origin && isFiniteLatLng(candidate.location)) {
    const distance = haversineMiles(origin, candidate.location);
    if (distance > 130) return false;
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
    matchedQueries: candidate.matchedQueries,
    types: candidate.types,
    primaryType: candidate.primaryType,
  });
  score += getMarketVisibilityScore(candidate);
  score += getCompetitorProminenceScore(candidate);
  score += getDistanceScore({ candidate, input, origin });

  if (candidate.websiteUrl) score += 8;
  if (candidate.googleBusinessUrl) score += 3;
  if (candidate.phone) score += 3;

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
  const debugReasons = candidate.debugReasons;

  const industryScore = getIndustryEvidenceScore({
    industry: input.industry,
    candidateName: candidate.name,
    matchedQueries: candidate.matchedQueries,
    websiteText,
    types: candidate.types,
    primaryType: candidate.primaryType,
  });
  score += industryScore;
  if (industryScore >= 35) debugReasons.push("strong service relevance");

  const visibilityScore = getMarketVisibilityScore(candidate);
  score += visibilityScore;
  if (visibilityScore >= 25) debugReasons.push("appears across multiple relevant searches");

  const prominenceScore = getCompetitorProminenceScore(candidate);
  score += prominenceScore;
  if ((candidate.reviewCount ?? 0) >= 100) debugReasons.push("high Google review volume");

  const distanceScore = getDistanceScore({ candidate, input, origin });
  score += distanceScore;
  if (distanceScore > 0) debugReasons.push("same broad service market");

  if (candidate.websiteUrl) score += 8;
  if (candidate.googleBusinessUrl) score += 3;
  if (candidate.phone) score += 3;
  if (candidate.logoUrl) score += 2;

  if (candidate.serviceFocus.length > 0) {
    score += Math.min(candidate.serviceFocus.length * 4, 16);
    debugReasons.push("service focus detected");
  }

  if (isLikelySameBusiness(candidate.name, input.companyName, candidate.websiteUrl, input.website ?? null)) {
    score -= 125;
  }

  return score;
}

function getFinalCandidateKey(candidate: EnrichedCandidate): string {
  return (
    dedupeIdentityKey(candidate) ??
    `${slugifyComparable(candidate.name)}:${normalizeCompetitorAddress(
      candidate.formattedAddress
    )}`
  );
}

function isVeryHighProminenceCandidate(candidate: EnrichedCandidate): boolean {
  const reviewCount = candidate.reviewCount ?? 0;
  const rating = candidate.rating ?? 0;

  return reviewCount >= 750 && rating >= 4.5;
}

function getHighProminenceReplacementRisk(candidate: EnrichedCandidate): number {
  const reviewCount = candidate.reviewCount ?? 0;
  const rating = candidate.rating ?? 0;

  let risk = 0;

  if (reviewCount < 100) {
    risk += 60;
  } else if (reviewCount < 250) {
    risk += 45;
  } else if (reviewCount < 500) {
    risk += 20;
  }

  if (candidate.hitCount <= 1) {
    risk += 30;
  } else if (candidate.hitCount <= 2) {
    risk += 12;
  }

  if (candidate.matchedAnchors.length <= 1) {
    risk += 10;
  }

  if (rating > 0 && rating < 4.7) {
    risk += 8;
  }

  if (!candidate.websiteUrl) {
    risk += 6;
  }

  return risk;
}

function selectFinalCompetitors(
  scoredCandidates: Array<{ candidate: EnrichedCandidate; score: number }>
): CompetitorCandidate[] {
  const sorted = [...scoredCandidates].sort((a, b) => b.score - a.score);
  const finalists = sorted.slice(0, MAX_FINAL_COMPETITORS);
  const finalistKeys = new Set(
    finalists.map((entry) => getFinalCandidateKey(entry.candidate))
  );

  const highProminenceChallengers = sorted
    .slice(MAX_FINAL_COMPETITORS)
    .filter((entry) => isVeryHighProminenceCandidate(entry.candidate))
    .sort(
      (a, b) =>
        (b.candidate.reviewCount ?? 0) - (a.candidate.reviewCount ?? 0)
    );

  for (const challenger of highProminenceChallengers.slice(0, 2)) {
    const challengerKey = getFinalCandidateKey(challenger.candidate);

    if (finalistKeys.has(challengerKey)) {
      continue;
    }

    const replacement = finalists
      .map((entry, index) => ({
        entry,
        index,
        risk: getHighProminenceReplacementRisk(entry.candidate),
      }))
      .filter(
        ({ entry, risk }) =>
          !isVeryHighProminenceCandidate(entry.candidate) && risk >= 40
      )
      .sort(
        (a, b) =>
          b.risk - a.risk ||
          a.entry.score - b.entry.score ||
          (a.entry.candidate.reviewCount ?? 0) -
            (b.entry.candidate.reviewCount ?? 0)
      )[0];

    if (!replacement) {
      continue;
    }

    const replacedKey = getFinalCandidateKey(replacement.entry.candidate);

    finalists[replacement.index] = challenger;
    finalistKeys.delete(replacedKey);
    finalistKeys.add(challengerKey);
  }

  return finalists
    .sort((a, b) => b.score - a.score)
    .map(({ candidate }) => toPublicCandidate(candidate));
}

function dedupeIdentityKey(candidate: Pick<CompetitorCandidate, "placeId" | "googleBusinessUrl" | "websiteUrl" | "phone">): string | null {
  if (candidate.placeId) return `place:${candidate.placeId}`;
  if (candidate.googleBusinessUrl) return `gbp:${candidate.googleBusinessUrl}`;

  const domain = normalizeDomain(candidate.websiteUrl);
  if (domain) return `domain:${domain}`;

  const phone = normalizePhoneDigits(candidate.phone);
  if (phone.length >= 7) return `phone:${phone}`;

  return null;
}

function areLikelyDuplicateCompetitors(
  left: CompetitorCandidate,
  right: CompetitorCandidate
): boolean {
  const leftHardKey = dedupeIdentityKey(left);
  const rightHardKey = dedupeIdentityKey(right);

  if (leftHardKey && rightHardKey && leftHardKey === rightHardKey) {
    return true;
  }

  const leftName = slugifyComparable(left.name);
  const rightName = slugifyComparable(right.name);

  if (!leftName || !rightName || leftName !== rightName) {
    return false;
  }

  const leftAddress = normalizeCompetitorAddress(left.formattedAddress);
  const rightAddress = normalizeCompetitorAddress(right.formattedAddress);

  if (leftAddress && rightAddress && leftAddress === rightAddress) return true;

  const leftDomainStem = normalizeDomainStem(left.websiteUrl);
  const rightDomainStem = normalizeDomainStem(right.websiteUrl);

  return Boolean(leftDomainStem && rightDomainStem && leftDomainStem === rightDomainStem);
}

function dedupeBusinessCandidates(candidates: CompetitorCandidate[]): CompetitorCandidate[] {
  const deduped: CompetitorCandidate[] = [];

  for (const candidate of candidates) {
    const existingIndex = deduped.findIndex((existing) =>
      areLikelyDuplicateCompetitors(existing, candidate)
    );

    if (existingIndex === -1) {
      deduped.push(candidate);
      continue;
    }

    const existing = deduped[existingIndex];
    const existingScore = getCompetitorProminenceScore(existing) + (existing.websiteUrl ? 8 : 0);
    const nextScore = getCompetitorProminenceScore(candidate) + (candidate.websiteUrl ? 8 : 0);

    if (nextScore > existingScore) deduped[existingIndex] = candidate;
  }

  return deduped;
}

function getRawCandidateKey(place: GooglePlace): string {
  const placeId = cleanString(place.id);
  if (placeId) return `place:${placeId}`;

  const domain = normalizeDomain(place.websiteUri);
  if (domain) return `domain:${domain}`;

  const phone = normalizePhoneDigits(place.nationalPhoneNumber);
  if (phone.length >= 7) return `phone:${phone}`;

  return `fallback:${slugifyComparable(place.displayName?.text)}:${slugifyComparable(place.formattedAddress)}`;
}

function placeToRawCandidate(params: {
  place: GooglePlace;
  query: string;
  pass: number;
  input: DiscoverCompetitorsInput;
}): RawPlaceCandidate | null {
  const name = cleanString(params.place.displayName?.text);
  if (!name) return null;

  const types = params.place.types ?? [];
  const matchedAnchor = inferAnchorFromQuery(params.query, params.input);
  const matchedServiceQuery = isServiceQuery(params.query, params.input.industry)
    ? params.query
    : null;

  return {
    placeId: cleanString(params.place.id),
    name,
    websiteUrl: cleanString(params.place.websiteUri),
    googleBusinessUrl: cleanString(params.place.googleMapsUri),
    formattedAddress: cleanString(params.place.formattedAddress),
    phone: cleanString(params.place.nationalPhoneNumber),
    types,
    primaryType: cleanString(params.place.primaryType),
    location: isFiniteLatLng(params.place.location) ? params.place.location : null,
    rating: typeof params.place.rating === "number" ? params.place.rating : null,
    reviewCount:
      typeof params.place.userRatingCount === "number"
        ? params.place.userRatingCount
        : null,
    matchedQueries: [params.query],
    matchedServiceQueries: matchedServiceQuery ? [matchedServiceQuery] : [],
    matchedAnchors: matchedAnchor ? [matchedAnchor] : [],
    queryPasses: [params.pass],
    hitCount: 1,
  };
}

function mergeRawCandidates(existing: RawPlaceCandidate, next: RawPlaceCandidate): RawPlaceCandidate {
  const mergeStrings = (left: string[], right: string[]) => Array.from(new Set([...left, ...right]));

  return {
    ...existing,
    placeId: existing.placeId ?? next.placeId,
    name: existing.name || next.name,
    websiteUrl: existing.websiteUrl ?? next.websiteUrl,
    googleBusinessUrl: existing.googleBusinessUrl ?? next.googleBusinessUrl,
    formattedAddress: existing.formattedAddress ?? next.formattedAddress,
    phone: existing.phone ?? next.phone,
    types: mergeStrings(existing.types, next.types),
    primaryType: existing.primaryType ?? next.primaryType,
    location: existing.location ?? next.location,
    rating: existing.rating ?? next.rating,
    reviewCount: (Math.max(existing.reviewCount ?? 0, next.reviewCount ?? 0) || existing.reviewCount || next.reviewCount || null),
    matchedQueries: mergeStrings(existing.matchedQueries, next.matchedQueries),
    matchedServiceQueries: mergeStrings(existing.matchedServiceQueries, next.matchedServiceQueries),
    matchedAnchors: mergeStrings(existing.matchedAnchors, next.matchedAnchors),
    queryPasses: mergeStrings(
      existing.queryPasses.map(String),
      next.queryPasses.map(String)
    ).map(Number),
    hitCount: existing.hitCount + next.hitCount,
  };
}

async function enrichRawCandidate(candidate: RawPlaceCandidate, input: DiscoverCompetitorsInput): Promise<EnrichedCandidate> {
  const html = await fetchWebsiteHtml(candidate.websiteUrl);
  const websiteText = html ? stripHtml(html).toLowerCase() : null;
  const websiteServiceFocus = inferServiceFocusFromWebsite({
    industry: input.industry,
    html,
  });
  const serviceFocus =
    websiteServiceFocus.length > 0
      ? websiteServiceFocus
      : inferServiceFocusFromEvidence({
          industry: input.industry,
          types: candidate.types,
          matchedQueries: candidate.matchedQueries,
          websiteText,
        });

  const logoUrl = await extractHomepageLogoCandidate({
    website: candidate.websiteUrl,
    brandName: candidate.name,
    html,
  });

  const enriched: EnrichedCandidate = {
    name: candidate.name,
    websiteUrl: candidate.websiteUrl,
    googleBusinessUrl: candidate.googleBusinessUrl,
    logoUrl: logoUrl ?? faviconFromWebsite(candidate.websiteUrl),
    whyItMatters: buildCompetitorSummary({
      industry: input.industry,
      formattedAddress: candidate.formattedAddress,
      phone: candidate.phone,
      websiteUrl: candidate.websiteUrl,
      serviceFocus,
      matchedQueries: candidate.matchedQueries,
      reviewCount: candidate.reviewCount,
      rating: candidate.rating,
    }),
    serviceFocus,
    formattedAddress: candidate.formattedAddress,
    phone: candidate.phone,
    placeId: candidate.placeId,
    rating: candidate.rating,
    reviewCount: candidate.reviewCount,
    types: candidate.types,
    primaryType: candidate.primaryType,
    location: candidate.location,
    matchedQueries: candidate.matchedQueries,
    matchedServiceQueries: candidate.matchedServiceQueries,
    matchedAnchors: candidate.matchedAnchors,
    queryPasses: candidate.queryPasses,
    hitCount: candidate.hitCount,
    debugReasons: [],
  };

  return enriched;
}

function toPublicCandidate(candidate: EnrichedCandidate): CompetitorCandidate {
  return {
    name: candidate.name,
    websiteUrl: candidate.websiteUrl,
    googleBusinessUrl: candidate.googleBusinessUrl,
    logoUrl: candidate.logoUrl,
    whyItMatters: candidate.whyItMatters,
    serviceFocus: candidate.serviceFocus,
    formattedAddress: candidate.formattedAddress,
    phone: candidate.phone,
    placeId: candidate.placeId,
    rating: candidate.rating,
    reviewCount: candidate.reviewCount,
  };
}

function scoreBusinessMatch(params: {
  candidateName: string;
  companyName: string;
  candidateWebsite: string | null;
  companyWebsite: string | null;
  candidateAddress: string | null;
  candidatePhone: string | null;
  companyPhone: string | null;
  city?: string | null;
  state?: string | null;
  reviewCount?: number | null;
  industryScore?: number;
}): number {
  let score = 0;
  const targetDomain = normalizeDomain(params.companyWebsite);
  const candidateDomain = normalizeDomain(params.candidateWebsite);

  if (targetDomain && candidateDomain && targetDomain === candidateDomain) score += 140;

  const normalizedCandidatePhone = normalizePhoneDigits(params.candidatePhone);
  const normalizedCompanyPhone = normalizePhoneDigits(params.companyPhone);

  if (
    normalizedCandidatePhone.length >= 7 &&
    normalizedCompanyPhone.length >= 7 &&
    normalizedCandidatePhone === normalizedCompanyPhone
  ) {
    score += 120;
  }

  const targetName = slugifyComparable(params.companyName);
  const candidateName = slugifyComparable(params.candidateName);

  if (targetName && candidateName && candidateName === targetName) score += 80;
  else if (hasStrongBrandOverlap(params.candidateName, params.companyName)) score += 45;
  else if (isStrongBusinessNameCandidate(params.candidateName, params.companyName)) score += 30;
  else score -= 75;

  const address = (params.candidateAddress ?? "").toLowerCase();
  const city = cleanWhitespace(params.city ?? "").toLowerCase();
  const state = cleanWhitespace(params.state ?? "").toLowerCase();

  if (city && address.includes(city)) score += 12;
  if (state && address.includes(state)) score += 8;
  if (typeof params.reviewCount === "number" && params.reviewCount > 0) score += Math.min(15, Math.floor(params.reviewCount / 25));
  if (typeof params.industryScore === "number") score += Math.min(25, Math.max(-25, params.industryScore));

  return score;
}

async function buildCandidateFromPlace(params: {
  apiKey: string;
  place: GooglePlace;
  input: LookupBusinessInput;
}): Promise<CompetitorCandidate & { matchScore: number; domainMatch: boolean; phoneMatch: boolean; strongNameMatch: boolean; accepted: boolean }> {
  const placeId = cleanString(params.place.id);
  const details = placeId ? await getPlaceDetails(params.apiKey, placeId) : null;

  const websiteUrl = cleanString(details?.websiteUri) ?? cleanString(params.place.websiteUri);
  const googleBusinessUrl = cleanString(details?.googleMapsUri) ?? cleanString(params.place.googleMapsUri);
  const formattedAddress = cleanString(details?.formattedAddress) ?? cleanString(params.place.formattedAddress);
  const phone = cleanString(details?.nationalPhoneNumber) ?? cleanString(params.place.nationalPhoneNumber);
  const name = cleanString(details?.displayName?.text) ?? cleanString(params.place.displayName?.text) ?? params.input.companyName;
  const types = details?.types ?? params.place.types ?? [];
  const primaryType = cleanString(details?.primaryType) ?? cleanString(params.place.primaryType);
  const rating = typeof details?.rating === "number" ? details.rating : typeof params.place.rating === "number" ? params.place.rating : null;
  const reviewCount = typeof details?.userRatingCount === "number" ? details.userRatingCount : typeof params.place.userRatingCount === "number" ? params.place.userRatingCount : null;
  const html = await fetchWebsiteHtml(websiteUrl);
  const websiteText = html ? stripHtml(html).toLowerCase() : null;

  const websiteServiceFocus = inferServiceFocusFromWebsite({
    industry: params.input.industry,
    html,
  });
  const serviceFocus = websiteServiceFocus.length > 0
    ? websiteServiceFocus
    : inferServiceFocusFromEvidence({
        industry: params.input.industry,
        types,
        matchedQueries: [params.input.companyName],
        websiteText,
      });

  const logoUrl = await extractHomepageLogoCandidate({ website: websiteUrl, brandName: name, html });
  const industryScore = getIndustryEvidenceScore({
    industry: params.input.industry,
    candidateName: name,
    matchedQueries: [params.input.companyName],
    websiteText,
    types,
    primaryType,
  });

  const matchScore = scoreBusinessMatch({
    candidateName: name,
    companyName: params.input.companyName,
    candidateWebsite: websiteUrl,
    companyWebsite: params.input.website ?? null,
    candidateAddress: formattedAddress,
    candidatePhone: phone,
    companyPhone: params.input.phone ?? null,
    city: params.input.city,
    state: params.input.state,
    reviewCount,
    industryScore,
  });

  const candidateDomain = normalizeDomain(websiteUrl);
  const inputDomain = normalizeDomain(params.input.website ?? null);
  const candidatePhone = normalizePhoneDigits(phone);
  const inputPhone = normalizePhoneDigits(params.input.phone);
  const domainMatch = Boolean(candidateDomain && inputDomain && candidateDomain === inputDomain);
  const phoneMatch = Boolean(candidatePhone.length >= 7 && inputPhone.length >= 7 && candidatePhone === inputPhone);
  const strongNameMatch = isStrongBusinessNameCandidate(name, params.input.companyName);
  const inputHasDomain = Boolean(inputDomain);
  const candidateHasDifferentDomain = Boolean(inputDomain && candidateDomain && inputDomain !== candidateDomain);
  const hasGoogleIdentity = Boolean(placeId || googleBusinessUrl);

  const accepted =
    hasGoogleIdentity &&
    (domainMatch ||
      phoneMatch ||
      (!inputHasDomain && strongNameMatch && matchScore >= 45) ||
      (inputHasDomain && strongNameMatch && !candidateHasDifferentDomain && matchScore >= 65));

  return {
    name,
    websiteUrl,
    googleBusinessUrl,
    logoUrl: logoUrl ?? faviconFromWebsite(websiteUrl),
    whyItMatters: buildCompetitorSummary({
      industry: params.input.industry,
      formattedAddress,
      phone,
      websiteUrl,
      serviceFocus,
      reviewCount,
      rating,
    }),
    serviceFocus,
    formattedAddress,
    phone,
    placeId: placeId ?? cleanString(details?.id),
    rating,
    reviewCount,
    matchScore,
    domainMatch,
    phoneMatch,
    strongNameMatch,
    accepted,
  };
}

export async function lookupBusinessCandidatesCore(
  input: LookupBusinessInput
): Promise<CompetitorCandidate[]> {
  console.log("[competitor-discovery] lookupBusinessCandidatesCore START", {
    companyName: input.companyName,
    industry: input.industry,
    city: input.city,
    state: input.state,
    website: input.website,
    phone: input.phone,
  });

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return [];

  const location = [input.city, input.state].filter(Boolean).join(" ").trim();
  const websiteDomain = normalizeDomain(input.website ?? null);
  const normalizedPhone = normalizePhoneDigits(input.phone);
  const formattedPhone = formatPhoneForQuery(input.phone);
  const domainStem = normalizeDomainStem(input.website ?? null);
  const queries = [
    websiteDomain ? `${input.companyName} ${websiteDomain}` : null,
    location ? `${input.companyName} ${location}` : input.companyName,
    formattedPhone ? `${input.companyName} ${formattedPhone}` : null,
    normalizedPhone.length >= 7 ? `${input.companyName} ${normalizedPhone}` : null,
    domainStem ? `${domainStem} ${location}`.trim() : null,
    `${input.companyName} reviews`,
  ]
    .filter((value): value is string => Boolean(value && value.trim().length > 0))
    .filter((value, index, array) => array.indexOf(value) === index)
    .slice(0, MAX_LOOKUP_TEXT_SEARCHES);

  const rawPlaces = new Map<string, GooglePlace>();

  for (const textQuery of queries) {
    try {
      const places = await searchText(apiKey, { textQuery });
      for (const place of places ?? []) {
        rawPlaces.set(getRawCandidateKey(place), place);
      }
    } catch (error) {
      console.error("Business candidate lookup failed for query", {
        textQuery,
        companyName: input.companyName,
        error,
      });
    }
  }

  if (rawPlaces.size === 0) {
    console.warn("[competitor-discovery] business lookup returned no raw places", {
      companyName: input.companyName,
      website: input.website,
      phone: input.phone,
      city: input.city,
      state: input.state,
      queries,
    });
    return [];
  }

  const candidates = await Promise.all(
    Array.from(rawPlaces.values())
      .slice(0, MAX_LOOKUP_ENRICH_POOL)
      .map((place) => buildCandidateFromPlace({ apiKey, place, input }))
  );

  console.log("[competitor-discovery] business lookup candidate evaluation", {
    companyName: input.companyName,
    candidateCount: candidates.length,
    candidates: candidates.map((item) => ({
      name: item.name,
      websiteUrl: item.websiteUrl,
      phone: item.phone,
      formattedAddress: item.formattedAddress,
      rating: item.rating,
      reviewCount: item.reviewCount,
      matchScore: item.matchScore,
      domainMatch: item.domainMatch,
      phoneMatch: item.phoneMatch,
      strongNameMatch: item.strongNameMatch,
      accepted: item.accepted,
    })),
  });

  return dedupeBusinessCandidates(
    candidates
      .filter((item) => item.accepted)
      .sort((a, b) => b.matchScore - a.matchScore)
      .map((item) => ({
        name: item.name,
        websiteUrl: item.websiteUrl,
        googleBusinessUrl: item.googleBusinessUrl,
        logoUrl: item.logoUrl,
        whyItMatters: item.whyItMatters,
        serviceFocus: item.serviceFocus,
        formattedAddress: item.formattedAddress,
        phone: item.phone,
        placeId: item.placeId,
        rating: item.rating,
        reviewCount: item.reviewCount,
      }))
      .slice(0, 5)
  );
}

export async function lookupSingleCompetitorCore(
  input: LookupBusinessInput
): Promise<CompetitorCandidate | null> {
  const candidates = await lookupBusinessCandidatesCore(input);
  return candidates[0] ?? null;
}

export async function discoverLocalCompetitorsCore(
  input: DiscoverCompetitorsInput
): Promise<CompetitorCandidate[]> {
  console.log("[competitor-discovery] discoverLocalCompetitorsCore START", {
    companyName: input.companyName,
    industry: input.industry,
    city: input.city,
    state: input.state,
    serviceArea: input.serviceArea,
    website: input.website,
  });

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.warn("GOOGLE_MAPS_API_KEY is missing. Skipping Google Places competitor discovery.");
    return [];
  }

  const origin = isFiniteLatLng(input.origin) ? input.origin : await resolveSearchOrigin(apiKey, input);
  const passes = buildSearchPasses(input);
  const collected = new Map<string, RawPlaceCandidate>();
  const rejectionStats = { sameBusiness: 0, weakIndustry: 0, tooFar: 0 };

  for (const searchPass of passes) {
    for (const query of searchPass.queries) {
      let places: GooglePlacesTextSearchResponse["places"];

      try {
        places = await searchText(apiKey, {
          textQuery: query,
          ...(origin
            ? {
                locationBias: {
                  circle: { center: origin, radius: searchPass.radiusMeters },
                },
              }
            : {}),
        });
      } catch (error) {
        console.error("Google Places text search failed", { query, error });
        continue;
      }

      for (const place of places ?? []) {
        const rawCandidate = placeToRawCandidate({ place, query, pass: searchPass.pass, input });
        if (!rawCandidate) continue;

        if (isLikelySameBusiness(rawCandidate.name, input.companyName, rawCandidate.websiteUrl, input.website ?? null)) {
          rejectionStats.sameBusiness += 1;
          continue;
        }

        if (!shouldKeepRawCandidate({ candidate: rawCandidate, input, origin })) {
          const rawScore = getIndustryEvidenceScore({
            industry: input.industry,
            candidateName: rawCandidate.name,
            matchedQueries: rawCandidate.matchedQueries,
            types: rawCandidate.types,
            primaryType: rawCandidate.primaryType,
          });

          if (rawScore < 4) rejectionStats.weakIndustry += 1;
          else rejectionStats.tooFar += 1;
          continue;
        }

        const key = getRawCandidateKey(place);
        const existing = collected.get(key);
        if (!existing) {
          collected.set(key, rawCandidate);
        } else {
          collected.set(key, mergeRawCandidates(existing, rawCandidate));
        }
      }
    }
  }

  const rankedBaseCandidates = Array.from(collected.values())
    .map((candidate) => ({ candidate, score: scoreRawCandidate({ candidate, input, origin }) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_ENRICH_POOL)
    .map(({ candidate }) => candidate);

  const enriched = await Promise.all(
    rankedBaseCandidates.slice(0, MAX_WEBSITE_FETCHES).map((candidate) => enrichRawCandidate(candidate, input))
  );

  const deduped: EnrichedCandidate[] = [];

  for (const candidate of enriched) {
    if (isLikelySameBusiness(candidate.name, input.companyName, candidate.websiteUrl, input.website ?? null)) {
      continue;
    }

    const existingIndex = deduped.findIndex((existing) => areLikelyDuplicateCompetitors(existing, candidate));

    if (existingIndex === -1) {
      deduped.push(candidate);
      continue;
    }

    const existing = deduped[existingIndex];
    const existingScore = scoreEnrichedCandidate({ candidate: existing, input, origin, websiteText: null });
    const nextScore = scoreEnrichedCandidate({ candidate, input, origin, websiteText: null });

    if (nextScore > existingScore) deduped[existingIndex] = candidate;
  }

  const scoredFinalCandidates = deduped.map((candidate) => ({
    candidate,
    score: scoreEnrichedCandidate({
      candidate,
      input,
      origin,
      websiteText: null,
    }),
  }));

  const finalCandidates = selectFinalCompetitors(scoredFinalCandidates);

  console.info("Competitor discovery diagnostics", {
    version: "2026-06-consumer-competition-v1",
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
      rating: candidate.rating,
      reviewCount: candidate.reviewCount,
      serviceFocus: candidate.serviceFocus,
    })),
  });

  return finalCandidates;
}
