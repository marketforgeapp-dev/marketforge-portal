type BudgetLine = {
  label: string;
  percentage: number;
  low: number;
  high: number;
};

type BudgetRecommendation = {
  totalLow: number;
  totalHigh: number;
  lines: BudgetLine[];
  note: string;
};

function normalizeAssetTypes(assetTypes: string[]) {
  const groups = new Set<string>();

  for (const assetType of assetTypes) {
    if (assetType === "GOOGLE_ADS") groups.add("GOOGLE_ADS");
    if (assetType === "META") groups.add("META");
    if (assetType === "GOOGLE_BUSINESS") groups.add("GOOGLE_BUSINESS");
    if (assetType === "YELP") groups.add("YELP");
    if (assetType === "EMAIL") groups.add("EMAIL");

    if (
      assetType === "BLOG" ||
      assetType === "SEO" ||
      assetType === "AEO_FAQ" ||
      assetType === "ANSWER_SNIPPET"
    ) {
      groups.add("WEBSITE_CONTENT");
    }
  }

  return Array.from(groups);
}

const GROUP_CONFIG: Record<
  string,
  { label: string; weight: number }
> = {
  GOOGLE_ADS: { label: "Google Ads", weight: 50 },
  META: { label: "Facebook & Instagram", weight: 30 },
  GOOGLE_BUSINESS: { label: "Google Business Profile", weight: 8 },
  YELP: { label: "Yelp", weight: 8 },
  EMAIL: { label: "Email", weight: 6 },
  WEBSITE_CONTENT: { label: "Website / SEO / AEO", weight: 18 },
};

export function getBudgetAllocationRecommendation(assetTypes: string[]) {
  const groups = normalizeAssetTypes(assetTypes);
  const hasPaid = groups.includes("GOOGLE_ADS") || groups.includes("META") || groups.includes("YELP");

  const totalLow = hasPaid ? 1200 : 300;
  const totalHigh = hasPaid ? 3000 : 900;

  const weightedGroups =
    groups.length > 0
      ? groups
      : ["GOOGLE_ADS", "META", "GOOGLE_BUSINESS", "WEBSITE_CONTENT"];

  const totalWeight = weightedGroups.reduce(
    (sum, group) => sum + GROUP_CONFIG[group].weight,
    0
  );

  const lines: BudgetLine[] = weightedGroups.map((group) => {
    const percentage = Math.round((GROUP_CONFIG[group].weight / totalWeight) * 100);

    return {
      label: GROUP_CONFIG[group].label,
      percentage,
      low: Math.round((totalLow * percentage) / 100),
      high: Math.round((totalHigh * percentage) / 100),
    };
  });

  return {
    totalLow,
    totalHigh,
    lines,
    note: hasPaid
      ? "This is a placeholder best-practice launch mix until MarketForge has enough live performance data to recommend budget allocations with more precision."
      : "This is a placeholder best-practice publishing and support budget until MarketForge has enough live performance data to recommend budget allocations with more precision.",
  } satisfies BudgetRecommendation;
}

export function buildBudgetRecommendationMarkdown(assetTypes: string[]) {
  const recommendation = getBudgetAllocationRecommendation(assetTypes);

  const lines = recommendation.lines
    .map(
      (line) =>
        `- ${line.label}: ${line.percentage}% (${line.low.toLocaleString()}–${line.high.toLocaleString()} recommended monthly budget)`
    )
    .join("\n");

  return `# Budget Allocation Recommendation

## Recommended Monthly Launch Budget
$${recommendation.totalLow.toLocaleString()}–$${recommendation.totalHigh.toLocaleString()}

## Suggested Platform Mix
${lines}

## Notes
${recommendation.note}
`;
}