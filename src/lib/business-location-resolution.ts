import type { WebsitePrefillContext } from "@/lib/website-prefill-context";

type LatLng = {
  latitude: number;
  longitude: number;
};

type GooglePlacesBusinessLookupResponse = {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    websiteUri?: string;
    googleMapsUri?: string;
    location?: LatLng;
  }>;
};

export type ResolvedBusinessLocation = {
  websiteAddress: string | null;
  websiteCity: string | null;
  websiteState: string | null;

  googlePlaceAddress: string | null;
  googlePlaceCity: string | null;
  googlePlaceState: string | null;
  googlePlaceLocation: LatLng | null;
  googleBusinessProfileUrl: string | null;

  resolvedAddress: string | null;
  resolvedCity: string | null;
  resolvedState: string | null;

  citySource: "website" | "google_places" | null;
  stateSource: "website" | "google_places" | null;
  addressSource: "website" | "google_places" | null;
};

function cleanString(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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

function parseCityStateFromFormattedAddress(address: string | null): {
  city: string | null;
  state: string | null;
} {
  const value = cleanString(address);
  if (!value) {
    return { city: null, state: null };
  }

  const match = value.match(/,\s*([^,]+),\s*([A-Z]{2})\s+\d{5}(?:-\d{4})?$/);

  if (!match) {
    return { city: null, state: null };
  }

  return {
    city: cleanString(match[1]),
    state: cleanString(match[2]),
  };
}

async function lookupBusinessPlace(input: {
  companyName: string;
  website: string;
  city?: string | null;
  state?: string | null;
}): Promise<{
  formattedAddress: string | null;
  city: string | null;
  state: string | null;
  googleBusinessProfileUrl: string | null;
  location: LatLng | null;
} | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  const location = [input.city, input.state].filter(Boolean).join(", ").trim();
  const query = location
    ? `${input.companyName} ${location}`
    : input.companyName;

  const response = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.websiteUri,places.googleMapsUri,places.location",
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
    const errorText = await response.text().catch(() => "");
    console.error("Business location Google Places lookup failed", {
      query,
      errorText,
    });
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

  if (!matchingPlace) {
    return null;
  }

  const formattedAddress = cleanString(matchingPlace.formattedAddress);
  const cityState = parseCityStateFromFormattedAddress(formattedAddress);

  return {
    formattedAddress,
    city: cityState.city,
    state: cityState.state,
    googleBusinessProfileUrl: cleanString(matchingPlace.googleMapsUri) ?? null,
    location: matchingPlace.location ?? null,
  };
}

export async function resolveBusinessLocation(input: {
  companyName: string;
  website: string;
  websiteContext: WebsitePrefillContext | null;
}): Promise<ResolvedBusinessLocation> {
  const websiteAddress = input.websiteContext?.address ?? null;
  const websiteCity = input.websiteContext?.city ?? null;
  const websiteState = input.websiteContext?.state ?? null;

  const googlePlace = await lookupBusinessPlace({
    companyName: input.companyName,
    website: input.website,
    city: websiteCity,
    state: websiteState,
  });

  const resolvedAddress = websiteAddress ?? googlePlace?.formattedAddress ?? null;
  const resolvedCity = websiteCity ?? googlePlace?.city ?? null;
  const resolvedState = websiteState ?? googlePlace?.state ?? null;

  return {
    websiteAddress,
    websiteCity,
    websiteState,

    googlePlaceAddress: googlePlace?.formattedAddress ?? null,
    googlePlaceCity: googlePlace?.city ?? null,
    googlePlaceState: googlePlace?.state ?? null,
    googlePlaceLocation: googlePlace?.location ?? null,
    googleBusinessProfileUrl: googlePlace?.googleBusinessProfileUrl ?? null,

    resolvedAddress,
    resolvedCity,
    resolvedState,

    addressSource: websiteAddress
      ? "website"
      : googlePlace?.formattedAddress
        ? "google_places"
        : null,
    citySource: websiteCity
      ? "website"
      : googlePlace?.city
        ? "google_places"
        : null,
    stateSource: websiteState
      ? "website"
      : googlePlace?.state
        ? "google_places"
        : null,
  };
}