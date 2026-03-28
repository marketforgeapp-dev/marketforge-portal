type Props = {
  businessRating: number | null;
  businessReviewCount: number | null;
  competitorMedianRating: number | null;
  competitorMedianReviewCount: number | null;
  position: "LEADING" | "COMPETITIVE" | "LAGGING" | "UNKNOWN";
  narrative: string | null;
};

function formatRating(value: number | null) {
  return value === null ? "—" : value.toFixed(1);
}

function formatReviewCount(value: number | null) {
  return value === null ? "—" : value.toLocaleString();
}

function getPositionLabel(
  position: "LEADING" | "COMPETITIVE" | "LAGGING" | "UNKNOWN"
) {
  switch (position) {
    case "LEADING":
      return "Leading";
    case "COMPETITIVE":
      return "Competitive";
    case "LAGGING":
      return "Lagging";
    default:
      return "Unknown";
  }
}

function getPositionClasses(
  position: "LEADING" | "COMPETITIVE" | "LAGGING" | "UNKNOWN"
) {
  switch (position) {
    case "LEADING":
      return "border border-emerald-200 bg-emerald-50 text-emerald-700";
    case "COMPETITIVE":
      return "border border-blue-200 bg-blue-50 text-blue-700";
    case "LAGGING":
      return "border border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border border-gray-200 bg-gray-50 text-gray-700";
  }
}

function getCompactNarrative(params: {
  position: "LEADING" | "COMPETITIVE" | "LAGGING" | "UNKNOWN";
  businessRating: number | null;
  competitorMedianRating: number | null;
  businessReviewCount: number | null;
  competitorMedianReviewCount: number | null;
  narrative: string | null;
}) {
  const {
    position,
    businessRating,
    competitorMedianRating,
    businessReviewCount,
    competitorMedianReviewCount,
    narrative,
  } = params;

  if (position === "LEADING") {
    return "You currently lead the local market on Google reputation.";
  }

  if (position === "LAGGING") {
    return "You currently trail the local market, so trust-building should carry more weight.";
  }

  if (position === "COMPETITIVE") {
    return "Your reputation is competitive locally, so execution and positioning matter most.";
  }

  if (
    businessRating === null &&
    competitorMedianRating === null &&
    businessReviewCount === null &&
    competitorMedianReviewCount === null
  ) {
    return "MarketForge does not yet have enough reputation data to compare your business against the local market.";
  }

  return (
    narrative ??
    "MarketForge has partial reputation data, but not enough to make a strong market comparison yet."
  );
}

export function CompetitivePositionCard({
  businessRating,
  businessReviewCount,
  competitorMedianRating,
  competitorMedianReviewCount,
  position,
  narrative,
}: Props) {
  const takeaway = getCompactNarrative({
    position,
    businessRating,
    competitorMedianRating,
    businessReviewCount,
    competitorMedianReviewCount,
    narrative,
  });

  return (
    <section className="mf-card rounded-3xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
            Competitive Position
          </p>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            Reputation vs local market
          </p>
        </div>

        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${getPositionClasses(
            position
          )}`}
        >
          {getPositionLabel(position)}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            You
          </p>
          <p className="mt-1 text-base font-bold text-gray-900">
            {formatRating(businessRating)}★
          </p>
          <p className="mt-0.5 text-xs text-gray-600">
            {formatReviewCount(businessReviewCount)} reviews
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            Market Median
          </p>
          <p className="mt-1 text-base font-bold text-gray-900">
            {formatRating(competitorMedianRating)}★
          </p>
          <p className="mt-0.5 text-xs text-gray-600">
            {formatReviewCount(competitorMedianReviewCount)} reviews
          </p>
        </div>
      </div>

      <p className="mt-3 text-sm leading-5 text-gray-700">{takeaway}</p>
    </section>
  );
}