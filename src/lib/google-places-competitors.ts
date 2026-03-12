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

const GOOGLE_PLACES_TEXT_SEARCH_URL =
  "https://places.googleapis.com/v1/places:searchText";

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
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
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

function inferServiceFocusFromTypes(types: string[] = []): string[] {
  const joined = types.join(" ").toLowerCase();
  const results: string[] = [];

  if (joined.includes("plumber")) results.push("General plumbing");
  if (joined.includes("drain")) results.push("Drain cleaning");
  if (joined.includes("repair")) results.push("Repairs");
  if (joined.includes("contractor")) results.push("Residential service");
  if (joined.includes("point_of_interest") && results.length === 0) {
    results.push("Local service business");
  }

  return results.slice(0, 4);
}

function defaultWhyItMatters(
  name: string,
  city: string | null,
  state: string | null
): string {
  const location = [city, state].filter(Boolean).join(", ");

  if (location) {
    return `Local ${location} competitor likely competing for the same service-area demand.`;
  }

  return `${name} appears to be a relevant local competitor in the same category.`;
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

  return false;
}

function getSearchQueries(input: DiscoverCompetitorsInput): string[] {
  const location = [input.city, input.state].filter(Boolean).join(" ").trim();
  const serviceArea = cleanString(input.serviceArea);
  const industryLabel =
    input.industry === "PLUMBING"
      ? "plumber"
      : input.industry === "HVAC"
        ? "hvac"
        : input.industry === "SEPTIC"
          ? "septic service"
          : "tree service";

  const queries = new Set<string>();

  if (location) {
    queries.add(`${industryLabel} in ${location}`);
    queries.add(`best ${industryLabel} in ${location}`);
    queries.add(`emergency ${industryLabel} in ${location}`);
  }

  if (serviceArea) {
    queries.add(`${industryLabel} near ${serviceArea}`);
  }

  if (!location && !serviceArea) {
    queries.add(`${industryLabel} near me`);
  }

  return Array.from(queries).slice(0, 3);
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
  const collected = new Map<string, CompetitorCandidate>();

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
      const nationalPhoneNumber = cleanString(place.nationalPhoneNumber);
      const types = place.types ?? [];

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

      const key =
        placeId ??
        `${slugifyComparable(name)}::${normalizeDomain(websiteUrl) ?? "no-domain"}`;

      if (!collected.has(key)) {
        collected.set(key, {
          name,
          websiteUrl,
          googleBusinessUrl,
          logoUrl: faviconFromWebsite(websiteUrl),
          whyItMatters: defaultWhyItMatters(
            name,
            input.city ?? null,
            input.state ?? null
          ),
          serviceFocus: inferServiceFocusFromTypes(types),
          formattedAddress,
          phone: nationalPhoneNumber,
          placeId,
        });
      }
    }
  }

  const baseCandidates = Array.from(collected.values()).slice(0, 8);

  const enriched = await Promise.all(
    baseCandidates.map(async (candidate) => {
      if (!candidate.placeId) {
        return candidate;
      }

      const details = await getPlaceDetails(apiKey, candidate.placeId);

      if (!details) {
        return candidate;
      }

      const websiteUrl = cleanString(details.websiteUri) ?? candidate.websiteUrl;
      const googleBusinessUrl =
        cleanString(details.googleMapsUri) ?? candidate.googleBusinessUrl;
      const types = details.types ?? [];

      return {
        ...candidate,
        websiteUrl,
        googleBusinessUrl,
        logoUrl: faviconFromWebsite(websiteUrl) ?? candidate.logoUrl,
        formattedAddress:
          cleanString(details.formattedAddress) ?? candidate.formattedAddress,
        phone: cleanString(details.nationalPhoneNumber) ?? candidate.phone,
        serviceFocus:
          inferServiceFocusFromTypes(types).length > 0
            ? inferServiceFocusFromTypes(types)
            : candidate.serviceFocus,
      };
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

    if (!deduped.has(key)) {
      deduped.set(key, candidate);
    }
  }

  return Array.from(deduped.values()).slice(0, 5);
}