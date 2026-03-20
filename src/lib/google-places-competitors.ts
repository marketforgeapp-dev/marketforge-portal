type GooglePlacesTextSearchResponse = {
  places?: Array<{
    id?: string;
    displayName?: {
      text?: string;
    };
    formattedAddress?: string;
    websiteUri?: string;
    googleMapsUri?: string;
    nationalPhoneNumber?: string;
    types?: string[];
    primaryType?: string;
  }>;
};

type GooglePlaceDetailsResponse = {
  id?: string;
  displayName?: {
    text?: string;
  };
  formattedAddress?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  nationalPhoneNumber?: string;
  types?: string[];
  primaryType?: string;
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

type DiscoverCompetitorsInput = {
  companyName: string;
  industry: "PLUMBING" | "HVAC" | "SEPTIC" | "TREE_SERVICE";
  city?: string | null;
  state?: string | null;
  serviceArea?: string | null;
  website?: string | null;
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
};

const GOOGLE_PLACES_TEXT_SEARCH_URL =
  "https://places.googleapis.com/v1/places:searchText";

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
]);

function cleanString(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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

function slugifyComparable(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
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

    if (matched) {
      overlapCount += 1;
    }
  }

  const overlapRatio = overlapCount / companyTokens.length;

  return overlapCount >= 1 && overlapRatio >= 0.5;
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
    lower.includes("wave") ||
    lower.includes("truck") ||
    lower.includes("team") ||
    lower.includes("review") ||
    lower.includes("plumber-reviews") ||
    lower.includes("near-") ||
    lower.includes("service-area")
  );
}

function looksLikeGoodLogo(url: string | null): boolean {
  if (!url) return false;

  const lower = url.toLowerCase();

  if (looksLikeBadgeOrTrustAsset(lower)) return false;
  if (looksLikeDecorativeAsset(lower)) return false;

  if (
    lower.includes("favicon") ||
    lower.includes("apple-touch-icon") ||
    lower.includes("site-icon") ||
    lower.includes("mask-icon") ||
    lower.includes("/icon-") ||
    lower.includes("/icons/")
  ) {
    return false;
  }

  if (
    lower.includes("logo") ||
    lower.includes("brand") ||
    lower.includes("header-logo") ||
    lower.includes("site-title") ||
    lower.includes("navbar")
  ) {
    return true;
  }

  if (lower.endsWith(".svg")) return true;
  if (lower.endsWith(".png")) return true;
  if (lower.endsWith(".webp")) return true;
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return true;

  return false;
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
          "Mozilla/5.0 (compatible; MarketForgeCompetitorBot/1.0; +https://marketforge.local)",
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

async function extractHomepageLogoCandidate(
  website: string | null
): Promise<string | null> {
  const html = await fetchWebsiteHtml(website);
  if (!html || !website) return null;

  const candidates = new Map<string, number>();

  const addCandidate = (url: string | null, isStrongTagMatch: boolean) => {
    if (!url) return;

    const lower = url.toLowerCase();

    if (!looksLikeGoodLogo(url)) return;

    let score = 0;

    if (isStrongTagMatch) score += 40;
    if (lower.includes("logo")) score += 35;
    if (lower.includes("brand")) score += 20;
    if (lower.includes("header")) score += 10;
    if (lower.includes("navbar")) score += 10;
    if (lower.includes("site-title")) score += 10;
    if (lower.endsWith(".svg")) score += 25;
    if (lower.endsWith(".png")) score += 8;

    if (looksLikeBadgeOrTrustAsset(lower)) score -= 100;
    if (looksLikeDecorativeAsset(lower)) score -= 50;
    if (lower.includes("og-image")) score -= 15;

    const existing = candidates.get(url) ?? Number.NEGATIVE_INFINITY;
    if (score > existing) {
      candidates.set(url, score);
    }
  };

  const imgTagMatches = [...html.matchAll(/<img\b[^>]*>/gi)];

  for (const match of imgTagMatches) {
    const tag = match[0] ?? "";
    const lowerTag = tag.toLowerCase();

    const looksLikeLogoTag =
      lowerTag.includes("logo") ||
      lowerTag.includes("brand") ||
      lowerTag.includes("header") ||
      lowerTag.includes("navbar") ||
      lowerTag.includes("site-title");

    const srcMatch =
      tag.match(/\ssrc=["']([^"']+)["']/i) ??
      tag.match(/\sdata-src=["']([^"']+)["']/i);

    if (srcMatch?.[1]) {
      const url = absolutizeUrl(srcMatch[1], website);
      addCandidate(url, looksLikeLogoTag);
    }

    const srcsetMatch = tag.match(/\ssrcset=["']([^"']+)["']/i);
    if (srcsetMatch?.[1]) {
      const firstSrcsetUrl = srcsetMatch[1].split(",")[0]?.trim().split(" ")[0];
      if (firstSrcsetUrl) {
        const url = absolutizeUrl(firstSrcsetUrl, website);
        addCandidate(url, looksLikeLogoTag);
      }
    }
  }

  const logoMetaMatches = [
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

  for (const match of logoMetaMatches) {
    const url = absolutizeUrl(match[1] ?? "", website);
    if (!url) continue;

    if (!looksLikeGoodLogo(url)) continue;

    addCandidate(url, false);
  }

  const best = Array.from(candidates.entries()).sort((a, b) => b[1] - a[1])[0];

    console.info("Competitor logo candidate selection", {
    website,
    candidates: Array.from(candidates.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([url, score]) => ({ url, score })),
    selected: best?.[0] ?? null,
  });

  return best?.[0] ?? null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferServiceFocusFromWebsite(params: {
  industry: DiscoverCompetitorsInput["industry"];
  website: string | null;
  html: string | null;
}): string[] {
  const text = stripHtml(params.html ?? "").toLowerCase();

  const addIf = (condition: boolean, label: string, bucket: Set<string>) => {
    if (condition) bucket.add(label);
  };

  const services = new Set<string>();

  if (params.industry === "PLUMBING") {
    addIf(text.includes("drain"), "Drain cleaning", services);
    addIf(text.includes("hydro jet") || text.includes("jetting"), "Hydro jetting", services);
    addIf(text.includes("water heater"), "Water heater service", services);
    addIf(text.includes("tankless"), "Tankless water heater", services);
    addIf(text.includes("leak"), "Leak repair", services);
    addIf(text.includes("slab leak"), "Slab leak repair", services);
    addIf(text.includes("burst pipe"), "Burst pipe repair", services);
    addIf(text.includes("toilet"), "Toilet repair", services);
    addIf(text.includes("garbage disposal"), "Garbage disposal repair & installation", services);
    addIf(text.includes("faucet") || text.includes("fixture"), "Faucets & fixtures", services);
    addIf(text.includes("gas line"), "Gas line service", services);
    addIf(text.includes("repipe"), "Repiping", services);
    addIf(text.includes("water softener"), "Water softener installation", services);
    addIf(text.includes("emergency"), "Emergency plumbing", services);
    addIf(text.includes("sewer line"), "Sewer line service", services);
  }

  if (params.industry === "SEPTIC") {
    addIf(text.includes("septic pumping"), "Septic tank pumping", services);
    addIf(text.includes("septic inspection") || text.includes("inspection"), "Septic system inspection", services);
    addIf(text.includes("drain field") || text.includes("leach field"), "Drain field repair", services);
    addIf(text.includes("riser") || text.includes("lid"), "Riser & lid installation", services);
    addIf(text.includes("lift pump"), "Lift pump service", services);
    addIf(text.includes("grease trap"), "Grease trap cleaning", services);
    addIf(text.includes("septic installation"), "Septic system installation", services);
  }

  if (params.industry === "TREE_SERVICE") {
    addIf(text.includes("tree removal"), "Tree removal", services);
    addIf(text.includes("trimming") || text.includes("pruning"), "Pruning & trimming", services);
    addIf(text.includes("stump"), "Stump grinding", services);
    addIf(text.includes("storm"), "Emergency storm service", services);
    addIf(text.includes("lot clearing") || text.includes("land clearing"), "Lot clearing", services);
    addIf(text.includes("arborist"), "Arborist consultations", services);
    addIf(text.includes("plant health"), "Plant health care", services);
  }

  if (params.industry === "HVAC") {
    addIf(text.includes("ac repair") || text.includes("air conditioning"), "AC repair", services);
    addIf(text.includes("furnace") || text.includes("heating repair"), "Heating repair", services);
    addIf(text.includes("maintenance") || text.includes("tune up"), "HVAC maintenance", services);
    addIf(text.includes("replacement"), "System replacement", services);
    addIf(text.includes("heat pump"), "Heat pump service", services);
  }

  return Array.from(services).slice(0, 8);
}

function inferServiceFocusFromTypes(
  types: string[] = [],
  industry: DiscoverCompetitorsInput["industry"]
): string[] {
  const joined = types.join(" ").toLowerCase();
  const results: string[] = [];

  if (industry === "PLUMBING") {
    if (joined.includes("plumber")) results.push("General plumbing");
    if (joined.includes("drain")) results.push("Drain cleaning");
    if (joined.includes("repair")) results.push("Repairs");
  }

  if (industry === "SEPTIC") {
    results.push("Septic service");
  }

  if (industry === "TREE_SERVICE") {
    results.push("Tree service");
  }

  if (industry === "HVAC") {
    results.push("HVAC service");
  }

  if (results.length === 0) {
    results.push("Local service business");
  }

  return results.slice(0, 4);
}

function isLikelySameBusiness(
  candidateName: string,
  companyName: string,
  candidateWebsite: string | null,
  companyWebsite: string | null
): boolean {
  const candidateNameKey = slugifyComparable(candidateName);
  const companyNameKey = slugifyComparable(companyName);

  const candidateDomain = normalizeDomain(candidateWebsite);
  const companyDomain = normalizeDomain(companyWebsite);

  if (candidateDomain && companyDomain && candidateDomain === companyDomain) {
    return true;
  }

  if (candidateNameKey && companyNameKey) {
    if (candidateNameKey === companyNameKey) return true;
    if (
      candidateNameKey.includes(companyNameKey) ||
      companyNameKey.includes(candidateNameKey)
    ) {
      return true;
    }
  }

  if (hasStrongBrandOverlap(candidateName, companyName)) {
    return true;
  }

  return false;
}

function getIndustryLabel(industry: DiscoverCompetitorsInput["industry"]): string {
  if (industry === "PLUMBING") return "plumber";
  if (industry === "HVAC") return "hvac contractor";
  if (industry === "SEPTIC") return "septic service";
  return "tree service";
}

function getSearchQueries(input: DiscoverCompetitorsInput): string[] {
  const location = [input.city, input.state].filter(Boolean).join(" ").trim();
  const serviceArea = cleanString(input.serviceArea);
  const industryLabel = getIndustryLabel(input.industry);

  const queries = new Set<string>();

  if (location) {
    queries.add(`${industryLabel} in ${location}`);
    queries.add(`best ${industryLabel} in ${location}`);
    queries.add(`${industryLabel} ${location}`);
  }

  if (serviceArea) {
    queries.add(`${industryLabel} near ${serviceArea}`);
  }

  if (!location && !serviceArea) {
    queries.add(`${industryLabel} near me`);
  }

  return Array.from(queries).slice(0, 4);
}

function matchesIndustryEnough(
  types: string[],
  primaryType: string | null,
  industry: DiscoverCompetitorsInput["industry"]
): boolean {
  const haystack = [...types, primaryType ?? ""].join(" ").toLowerCase();

  if (industry === "PLUMBING") {
    return (
      haystack.includes("plumber") ||
      haystack.includes("plumbing") ||
      haystack.includes("drain")
    );
  }

  if (industry === "HVAC") {
    return (
      haystack.includes("hvac") ||
      haystack.includes("heating") ||
      haystack.includes("air_conditioning") ||
      haystack.includes("air conditioning")
    );
  }

  if (industry === "SEPTIC") {
    return (
      haystack.includes("septic") ||
      haystack.includes("sewer") ||
      haystack.includes("waste") ||
      haystack.includes("plumber")
    );
  }

  return (
    haystack.includes("tree") ||
    haystack.includes("arbor") ||
    haystack.includes("landscap")
  );
}

function locationMatchesEnough(
  formattedAddress: string | null,
  city: string | null | undefined,
  state: string | null | undefined
): boolean {
  const address = (formattedAddress ?? "").toLowerCase();
  const cityLower = (city ?? "").trim().toLowerCase();
  const stateLower = (state ?? "").trim().toLowerCase();

  if (!address) return false;

  if (cityLower && address.includes(cityLower)) return true;
  if (stateLower && address.includes(stateLower)) return true;

  return false;
}

function scoreCompetitorCandidate(
  candidate: RawPlaceCandidate,
  input: DiscoverCompetitorsInput
): number {
  let score = 0;

  if (matchesIndustryEnough(candidate.types, candidate.primaryType, input.industry)) {
    score += 50;
  } else {
    score -= 40;
  }

  if (candidate.websiteUrl) score += 15;
  if (candidate.formattedAddress) score += 8;
  if (candidate.phone) score += 6;
  if (candidate.googleBusinessUrl) score += 4;

  if (
    locationMatchesEnough(
      candidate.formattedAddress,
      input.city ?? null,
      input.state ?? null
    )
  ) {
    score += 12;
  }

  if (hasStrongBrandOverlap(candidate.name, input.companyName)) {
    score -= 60;
  }

  return score;
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
      `Service signals: ${params.serviceFocus.slice(0, 3).join(", ")}.`
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

async function searchText(
  apiKey: string,
  textQuery: string
): Promise<GooglePlacesTextSearchResponse["places"]> {
  const response = await fetch(GOOGLE_PLACES_TEXT_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.websiteUri,places.googleMapsUri,places.nationalPhoneNumber,places.types,places.primaryType",
    },
    body: JSON.stringify({
      textQuery,
      pageSize: 10,
      languageCode: "en",
      regionCode: "US",
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
          "id,displayName,formattedAddress,websiteUri,googleMapsUri,nationalPhoneNumber,types,primaryType",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as GooglePlaceDetailsResponse;
}

export async function lookupSingleCompetitor(input: {
  companyName: string;
  industry: "PLUMBING" | "HVAC" | "SEPTIC" | "TREE_SERVICE";
  city?: string | null;
  state?: string | null;
  website?: string | null;
}): Promise<CompetitorCandidate | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return null;
  }

  const location = [input.city, input.state].filter(Boolean).join(" ").trim();
  const textQuery = location
    ? `${input.companyName} ${location}`
    : input.companyName;

  let places: GooglePlacesTextSearchResponse["places"];

  try {
    places = await searchText(apiKey, textQuery);
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
  const homepageLogo = await extractHomepageLogoCandidate(websiteUrl);
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

  return {
    name:
      cleanString(details?.displayName?.text) ??
      cleanString(bestPlace.displayName?.text) ??
      input.companyName,
    websiteUrl,
    googleBusinessUrl,
    logoUrl: homepageLogo ?? faviconFromWebsite(websiteUrl),
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
    placeId,
  };
}

export async function discoverLocalCompetitors(
  input: DiscoverCompetitorsInput
): Promise<CompetitorCandidate[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.warn(
      "GOOGLE_MAPS_API_KEY is missing. Skipping Google Places competitor discovery."
    );
    return [];
  }

  const queries = getSearchQueries(input);
  const collected = new Map<string, RawPlaceCandidate>();

  for (const query of queries) {
    let places: GooglePlacesTextSearchResponse["places"];

    try {
      places = await searchText(apiKey, query);
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

      if (
        isLikelySameBusiness(
          name,
          input.companyName,
          websiteUrl,
          input.website ?? null
        )
      ) {
        continue;
      }

      if (!matchesIndustryEnough(types, primaryType, input.industry)) {
        continue;
      }

      const key =
        placeId ??
        `${slugifyComparable(name)}::${normalizeDomain(websiteUrl) ?? "no-domain"}::${
          formattedAddress ?? "no-address"
        }`;

      const existing = collected.get(key);

      const candidate: RawPlaceCandidate = {
        placeId,
        name,
        websiteUrl,
        googleBusinessUrl,
        formattedAddress,
        phone,
        types,
        primaryType,
      };

      if (!existing) {
        collected.set(key, candidate);
        continue;
      }

      const existingScore = scoreCompetitorCandidate(existing, input);
      const nextScore = scoreCompetitorCandidate(candidate, input);

      if (nextScore > existingScore) {
        collected.set(key, candidate);
      }
    }
  }

  const rankedBaseCandidates = Array.from(collected.values())
    .map((candidate) => ({
      candidate,
      score: scoreCompetitorCandidate(candidate, input),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
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

      const html = await fetchWebsiteHtml(websiteUrl);
      const homepageLogo = await extractHomepageLogoCandidate(websiteUrl);

      const serviceFocusFromWebsite = inferServiceFocusFromWebsite({
        industry: input.industry,
        website: websiteUrl,
        html,
      });

      const serviceFocus =
        serviceFocusFromWebsite.length > 0
          ? serviceFocusFromWebsite
          : inferServiceFocusFromTypes(types, input.industry);

      return {
        name:
          cleanString(details?.displayName?.text) ?? candidate.name,
        websiteUrl,
        googleBusinessUrl,
        logoUrl: homepageLogo ?? faviconFromWebsite(websiteUrl),
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
      } satisfies CompetitorCandidate;
    })
  );

  const deduped = new Map<string, CompetitorCandidate>();

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

    const key =
      normalizeDomain(candidate.websiteUrl) ??
      `${slugifyComparable(candidate.name)}::${candidate.formattedAddress ?? "no-address"}`;

    const existing = deduped.get(key);

    if (!existing) {
      deduped.set(key, candidate);
      continue;
    }

    const existingScore = scoreCompetitorCandidate(
      {
        placeId: existing.placeId,
        name: existing.name,
        websiteUrl: existing.websiteUrl,
        googleBusinessUrl: existing.googleBusinessUrl,
        formattedAddress: existing.formattedAddress,
        phone: existing.phone,
        types: [],
        primaryType: null,
      },
      input
    );

    const nextScore = scoreCompetitorCandidate(
      {
        placeId: candidate.placeId,
        name: candidate.name,
        websiteUrl: candidate.websiteUrl,
        googleBusinessUrl: candidate.googleBusinessUrl,
        formattedAddress: candidate.formattedAddress,
        phone: candidate.phone,
        types: [],
        primaryType: null,
      },
      input
    );

    if (nextScore > existingScore) {
      deduped.set(key, candidate);
    }
  }

  return Array.from(deduped.values()).slice(0, 5);
}