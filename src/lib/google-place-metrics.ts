type GooglePlaceMetricsResponse = {
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

  const data = (await response.json()) as GooglePlaceMetricsResponse;

  return {
    rating: typeof data.rating === "number" ? data.rating : null,
    reviewCount:
      typeof data.userRatingCount === "number" ? data.userRatingCount : null,
  };
}