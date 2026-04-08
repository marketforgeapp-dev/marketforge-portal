type BudgetLine = {
  label: string;
  percentage: number;
  recommendedBudget: number;
};

type BudgetRecommendation = {
  actionBudget: number;
  lines: BudgetLine[];
  note: string;
};

type BudgetInput = {
  assetTypes?: string[];
  revenueLow?: number | null;
  revenueHigh?: number | null;
  score?: number | null;
  actionFraming?: string | null;
  opportunityType?: string | null;
};

type BudgetMode = "PAID" | "ORGANIC";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function roundToNearest(value: number, step: number) {
  return Math.round(value / step) * step;
}

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

const GROUP_CONFIG: Record<string, { label: string; weight: number }> = {
  GOOGLE_ADS: { label: "Google Ads", weight: 50 },
  META: { label: "Facebook & Instagram", weight: 30 },
  GOOGLE_BUSINESS: { label: "Google Business Profile", weight: 10 },
  YELP: { label: "Yelp", weight: 10 },
  EMAIL: { label: "Email", weight: 8 },
  WEBSITE_CONTENT: { label: "Website / SEO / AEO", weight: 20 },
};

function hasPaidAssetTypes(assetTypes: string[]) {
  return assetTypes.some(
    (assetType) =>
      assetType === "GOOGLE_ADS" ||
      assetType === "META" ||
      assetType === "YELP"
  );
}

function inferBudgetMode(input: BudgetInput): BudgetMode {
  const assetTypes = input.assetTypes ?? [];

  if (assetTypes.length > 0) {
    return hasPaidAssetTypes(assetTypes) ? "PAID" : "ORGANIC";
  }

  const normalizedActionFraming = (input.actionFraming ?? "").toUpperCase();
  const normalizedOpportunityType = (input.opportunityType ?? "").toUpperCase();

  if (normalizedOpportunityType === "AI_SEARCH_VISIBILITY") {
    return "ORGANIC";
  }

  if (
    normalizedActionFraming.includes("AEO") ||
    normalizedActionFraming.includes("SEO") ||
    normalizedActionFraming.includes("CONTENT") ||
    normalizedActionFraming.includes("REPUTATION")
  ) {
    return "ORGANIC";
  }

  return "PAID";
}

export function getRecommendedActionBudget(input: BudgetInput): number {
  const mode = inferBudgetMode(input);

  const revenueLow = typeof input.revenueLow === "number" ? input.revenueLow : 0;
  const revenueHigh =
    typeof input.revenueHigh === "number" ? input.revenueHigh : 0;
  const revenueAnchor = Math.max(revenueHigh, revenueLow, 0);
  const score = typeof input.score === "number" ? input.score : 80;

  const scoreMultiplier =
    score >= 120
      ? 1.15
      : score >= 100
        ? 1.05
        : score >= 80
          ? 1
          : score >= 60
            ? 0.9
            : 0.8;

  const floor = mode === "PAID" ? 500 : 150;
  const ceiling = mode === "PAID" ? 3000 : 1200;
  const fallback = mode === "PAID" ? 1000 : 300;

  const rawBudget =
    revenueAnchor > 0
      ? revenueAnchor * (mode === "PAID" ? 0.2 : 0.08) * scoreMultiplier
      : fallback;

  return clamp(roundToNearest(rawBudget, 50), floor, ceiling);
}

export function getBudgetAllocationRecommendation(
  assetTypes: string[],
  input: Omit<BudgetInput, "assetTypes"> = {}
): BudgetRecommendation {
  const normalizedGroups = normalizeAssetTypes(assetTypes);
  const mode = inferBudgetMode({ ...input, assetTypes });
  const actionBudget = getRecommendedActionBudget({
    ...input,
    assetTypes,
  });

  const weightedGroups =
    normalizedGroups.length > 0
      ? normalizedGroups
      : mode === "PAID"
        ? ["GOOGLE_ADS", "META", "GOOGLE_BUSINESS"]
        : ["GOOGLE_BUSINESS", "WEBSITE_CONTENT", "EMAIL"];

  const totalWeight = weightedGroups.reduce(
    (sum, group) => sum + GROUP_CONFIG[group].weight,
    0
  );

  let allocatedSoFar = 0;

  const lines: BudgetLine[] = weightedGroups.map((group, index) => {
    const percentage = Math.round((GROUP_CONFIG[group].weight / totalWeight) * 100);

    const recommendedBudget =
      index === weightedGroups.length - 1
        ? Math.max(actionBudget - allocatedSoFar, 0)
        : roundToNearest((actionBudget * percentage) / 100, 10);

    allocatedSoFar += recommendedBudget;

    return {
      label: GROUP_CONFIG[group].label,
      percentage,
      recommendedBudget,
    };
  });

  return {
    actionBudget,
    lines,
    note:
      mode === "PAID"
        ? "This recommended action budget prioritizes immediate demand capture while keeping support coverage on the approved channels."
        : "This recommended action budget prioritizes publishing, visibility, and support work across the approved channels.",
  };
}

export function buildBudgetRecommendationMarkdown(assetTypes: string[]) {
  const recommendation = getBudgetAllocationRecommendation(assetTypes);

  const lines = recommendation.lines
    .map(
      (line) =>
        `- ${line.label}: ${line.percentage}% ($${line.recommendedBudget.toLocaleString()})`
    )
    .join("\n");

  return `# Budget Allocation Recommendation

## Recommended Action Budget
$${recommendation.actionBudget.toLocaleString()}

## Recommended Platform Allocation
${lines}

## Notes
${recommendation.note}
`;
}