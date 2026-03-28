import { BusinessProfile, Competitor } from "@/generated/prisma";

export type ReputationPosition =
  | "LEADING"
  | "COMPETITIVE"
  | "LAGGING"
  | "UNKNOWN";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function median(values: number[]) {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

function scoreStrength(rating: number | null, reviewCount: number | null) {
  if (rating === null && reviewCount === null) {
    return null;
  }

  const ratingComponent =
    rating === null ? 0 : clamp(((rating - 3.5) / 1.5) * 70, 0, 70);

  const reviewComponent =
    reviewCount === null
      ? 0
      : clamp((Math.log10(reviewCount + 1) / 3) * 30, 0, 30);

  return clamp(ratingComponent + reviewComponent, 0, 100);
}

export function deriveWorkspaceReputationSignal(
  profile: BusinessProfile,
  competitors: Competitor[]
): {
  position: ReputationPosition;
  businessStrength: number | null;
  competitorMedianStrength: number | null;
  businessRating: number | null;
  businessReviewCount: number | null;
  competitorMedianRating: number | null;
  competitorMedianReviewCount: number | null;
  strengthGap: number | null;
  ratingGap: number | null;
  reviewCountGap: number | null;
  narrative: string | null;
} {
  const businessRating = profile.googleRating ?? null;
  const businessReviewCount = profile.googleReviewCount ?? null;

  const competitorRatings = competitors
    .map((competitor) => competitor.rating ?? null)
    .filter((value): value is number => value !== null);

  const competitorReviewCounts = competitors
    .map((competitor) => competitor.reviewCount ?? null)
    .filter((value): value is number => value !== null);

  const competitorStrengths = competitors
    .map((competitor) =>
      scoreStrength(competitor.rating ?? null, competitor.reviewCount ?? null)
    )
    .filter((value): value is number => value !== null);

  const businessStrength = scoreStrength(businessRating, businessReviewCount);
  const competitorMedianStrength = median(competitorStrengths);
  const competitorMedianRating = median(competitorRatings);
  const competitorMedianReviewCount = median(competitorReviewCounts);

  const strengthGap =
    businessStrength !== null && competitorMedianStrength !== null
      ? businessStrength - competitorMedianStrength
      : null;

  const ratingGap =
    businessRating !== null && competitorMedianRating !== null
      ? businessRating - competitorMedianRating
      : null;

  const reviewCountGap =
    businessReviewCount !== null && competitorMedianReviewCount !== null
      ? businessReviewCount - competitorMedianReviewCount
      : null;

  if (businessStrength === null || competitorMedianStrength === null) {
    return {
      position: "UNKNOWN",
      businessStrength,
      competitorMedianStrength,
      businessRating,
      businessReviewCount,
      competitorMedianRating,
      competitorMedianReviewCount,
      strengthGap: null,
      ratingGap,
      reviewCountGap,
      narrative: null,
    };
  }

  if (strengthGap !== null && strengthGap >= 8) {
    return {
      position: "LEADING",
      businessStrength,
      competitorMedianStrength,
      businessRating,
      businessReviewCount,
      competitorMedianRating,
      competitorMedianReviewCount,
      strengthGap,
      ratingGap,
      reviewCountGap,
      narrative:
        "Your Google reputation currently leads the local competitor set, which creates more room for premium positioning and higher-confidence demand capture.",
    };
  }

  if (strengthGap !== null && strengthGap <= -8) {
    return {
      position: "LAGGING",
      businessStrength,
      competitorMedianStrength,
      businessRating,
      businessReviewCount,
      competitorMedianRating,
      competitorMedianReviewCount,
      strengthGap,
      ratingGap,
      reviewCountGap,
      narrative:
        "Your Google reputation currently trails the local competitor set, so trust-building and stronger proof should carry more weight before pushing harder demand capture.",
    };
  }

  return {
    position: "COMPETITIVE",
    businessStrength,
    competitorMedianStrength,
    businessRating,
    businessReviewCount,
    competitorMedianRating,
    competitorMedianReviewCount,
    strengthGap,
    ratingGap,
    reviewCountGap,
    narrative:
      "Your Google reputation is broadly competitive with the local market, so service positioning and execution quality are likely to decide who wins more demand.",
  };
}

export function getReputationVariantAdjustment(params: {
  position: ReputationPosition;
  kind: "primary" | "urgent" | "capacity" | "trust" | "premium";
}) {
  const { position, kind } = params;

  if (position === "LAGGING") {
    if (kind === "trust") return 12;
    if (kind === "primary") return -1;
    if (kind === "urgent") return -3;
    if (kind === "capacity") return -2;
    if (kind === "premium") return -7;
  }

  if (position === "LEADING") {
    if (kind === "trust") return -2;
    if (kind === "primary") return 4;
    if (kind === "urgent") return 5;
    if (kind === "capacity") return 2;
    if (kind === "premium") return 8;
  }

  if (position === "COMPETITIVE") {
    if (kind === "trust") return 1;
    if (kind === "primary") return 1;
    if (kind === "urgent") return 1;
    if (kind === "capacity") return 0;
    if (kind === "premium") return 2;
  }

  return 0;
}