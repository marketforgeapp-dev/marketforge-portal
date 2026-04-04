type GooglePlaceDetailsResponse = {
  displayName?: { text?: string };
  formattedAddress?: string;
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
};

export async function getGooglePlaceMetrics(placeId: string): Promise<{
  rating: number | null;
  reviewCount: number | null;
}> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY is missing");
  }

  const response = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
    {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "rating,userRatingCount",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(`Google Place metrics failed: ${response.status}`);
  }

  const data = (await response.json()) as GooglePlaceDetailsResponse;

  return {
    rating: typeof data.rating === "number" ? data.rating : null,
    reviewCount:
      typeof data.userRatingCount === "number" ? data.userRatingCount : null,
  };
}

export async function getGooglePlaceSummary(placeId: string): Promise<{
  name: string | null;
  formattedAddress: string | null;
  googleBusinessUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
}> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY is missing");
  }

  const response = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
    {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "displayName,formattedAddress,googleMapsUri,rating,userRatingCount",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(`Google Place summary failed: ${response.status}`);
  }

  const data = (await response.json()) as GooglePlaceDetailsResponse;

  return {
    name: typeof data.displayName?.text === "string" ? data.displayName.text : null,
    formattedAddress:
      typeof data.formattedAddress === "string" ? data.formattedAddress : null,
    googleBusinessUrl:
      typeof data.googleMapsUri === "string" ? data.googleMapsUri : null,
    rating: typeof data.rating === "number" ? data.rating : null,
    reviewCount:
      typeof data.userRatingCount === "number" ? data.userRatingCount : null,
  };
}