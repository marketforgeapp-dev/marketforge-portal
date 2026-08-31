import { z } from "zod";

export const WEBSITE_INTELLIGENCE_VERSION = 1;

export const websiteIntelligenceStatusSchema = z.enum([
  "STRONG",
  "PARTIAL",
  "WEAK",
  "INSUFFICIENT_EVIDENCE",
]);

export type WebsiteIntelligenceStatus = z.infer<
  typeof websiteIntelligenceStatusSchema
>;

export const websiteIntelligenceEvidenceSchema = z.object({
  finding: z.string().min(1),
  sourceUrl: z.string().nullable(),
});

export type WebsiteIntelligenceEvidence = z.infer<
  typeof websiteIntelligenceEvidenceSchema
>;

export const websiteIntelligenceDimensionSchema = z.object({
  status: websiteIntelligenceStatusSchema,
  summary: z.string().min(1),
  evidence: z.array(websiteIntelligenceEvidenceSchema).max(12),
});

export type WebsiteIntelligenceDimension = z.infer<
  typeof websiteIntelligenceDimensionSchema
>;

export const websiteIntelligenceServiceCoverageSchema = z.object({
  service: z.string().min(1),

  presence: websiteIntelligenceStatusSchema,
  depth: websiteIntelligenceStatusSchema,
  structure: websiteIntelligenceStatusSchema,

  summary: z.string().min(1),
  evidence: z.array(websiteIntelligenceEvidenceSchema).max(8),
});

export type WebsiteIntelligenceServiceCoverage = z.infer<
  typeof websiteIntelligenceServiceCoverageSchema
>;

export const websiteIntelligenceGapTypeSchema = z.enum([
  "BUSINESS_UNDERSTANDING",
  "SERVICE_AUTHORITY",
  "KNOWLEDGE_DEPTH",
  "STRUCTURED_CLARITY",
  "LOCAL_RELEVANCE",
  "TRUST_CREDIBILITY",
  "CONSISTENCY",
]);

export type WebsiteIntelligenceGapType = z.infer<
  typeof websiteIntelligenceGapTypeSchema
>;

export const websiteIntelligenceGapSchema = z.object({
  type: websiteIntelligenceGapTypeSchema,
  service: z.string().nullable(),
  summary: z.string().min(1),
  whyItMatters: z.string().min(1),
  evidence: z.array(websiteIntelligenceEvidenceSchema).max(8),
});

export type WebsiteIntelligenceGap = z.infer<
  typeof websiteIntelligenceGapSchema
>;

export const websiteIntelligenceObservedSignalsSchema = z.object({
  serviceContentUrls: z.array(z.string()).max(30),

  dedicatedKnowledgeUrls: z.array(z.string()).max(30),
  dedicatedFaqUrls: z.array(z.string()).max(20),

  detectedServiceAreaLocations: z.array(z.string()).max(50),

  googleBusinessProfileLinkObserved: z.boolean(),
});

export type WebsiteIntelligenceObservedSignals = z.infer<
  typeof websiteIntelligenceObservedSignalsSchema
>;

export const websiteIntelligenceAssessmentSchema = z.object({
  version: z.literal(WEBSITE_INTELLIGENCE_VERSION),

  website: z.string().min(1),

  overallSummary: z.string().min(1),

  dimensions: z.object({
    businessUnderstanding: websiteIntelligenceDimensionSchema,
    serviceAuthority: websiteIntelligenceDimensionSchema,
    knowledgeDepth: websiteIntelligenceDimensionSchema,
    structuredClarity: websiteIntelligenceDimensionSchema,
    localRelevance: websiteIntelligenceDimensionSchema,
    trustCredibility: websiteIntelligenceDimensionSchema,
    consistency: websiteIntelligenceDimensionSchema,
  }),

  serviceCoverage: z.array(websiteIntelligenceServiceCoverageSchema).max(30),

  observedSignals: websiteIntelligenceObservedSignalsSchema,

  strongestGaps: z.array(websiteIntelligenceGapSchema).max(5),

  internalReadinessScore: z.number().int().min(0).max(100),
});

export type WebsiteIntelligenceAssessment = z.infer<
  typeof websiteIntelligenceAssessmentSchema
>;

export function parseWebsiteIntelligenceAssessment(
  value: unknown
): WebsiteIntelligenceAssessment | null {
  const result = websiteIntelligenceAssessmentSchema.safeParse(value);

  return result.success ? result.data : null;
}

const WEBSITE_INTELLIGENCE_STATUS_VALUE: Record<
  WebsiteIntelligenceStatus,
  number
> = {
  STRONG: 1,
  PARTIAL: 0.6,
  WEAK: 0.25,
  INSUFFICIENT_EVIDENCE: 0.5,
};

const WEBSITE_INTELLIGENCE_DIMENSION_WEIGHTS = {
  businessUnderstanding: 15,
  serviceAuthority: 25,
  knowledgeDepth: 20,
  structuredClarity: 10,
  localRelevance: 10,
  trustCredibility: 10,
  consistency: 10,
} as const;

export function calculateWebsiteIntelligenceReadinessScore(
  assessment: Pick<
    WebsiteIntelligenceAssessment,
    "dimensions" | "serviceCoverage"
  >
): number {
  const dimensionScore =
    WEBSITE_INTELLIGENCE_DIMENSION_WEIGHTS.businessUnderstanding *
      WEBSITE_INTELLIGENCE_STATUS_VALUE[
        assessment.dimensions.businessUnderstanding.status
      ] +
    WEBSITE_INTELLIGENCE_DIMENSION_WEIGHTS.serviceAuthority *
      WEBSITE_INTELLIGENCE_STATUS_VALUE[
        assessment.dimensions.serviceAuthority.status
      ] +
    WEBSITE_INTELLIGENCE_DIMENSION_WEIGHTS.knowledgeDepth *
      WEBSITE_INTELLIGENCE_STATUS_VALUE[
        assessment.dimensions.knowledgeDepth.status
      ] +
    WEBSITE_INTELLIGENCE_DIMENSION_WEIGHTS.structuredClarity *
      WEBSITE_INTELLIGENCE_STATUS_VALUE[
        assessment.dimensions.structuredClarity.status
      ] +
    WEBSITE_INTELLIGENCE_DIMENSION_WEIGHTS.localRelevance *
      WEBSITE_INTELLIGENCE_STATUS_VALUE[
        assessment.dimensions.localRelevance.status
      ] +
    WEBSITE_INTELLIGENCE_DIMENSION_WEIGHTS.trustCredibility *
      WEBSITE_INTELLIGENCE_STATUS_VALUE[
        assessment.dimensions.trustCredibility.status
      ] +
    WEBSITE_INTELLIGENCE_DIMENSION_WEIGHTS.consistency *
      WEBSITE_INTELLIGENCE_STATUS_VALUE[
        assessment.dimensions.consistency.status
      ];

  if (assessment.serviceCoverage.length === 0) {
    return Math.max(0, Math.min(100, Math.round(dimensionScore)));
  }

  const serviceCoverageScore =
    (assessment.serviceCoverage.reduce((total, service) => {
      const serviceScore =
        WEBSITE_INTELLIGENCE_STATUS_VALUE[service.presence] * 0.3 +
        WEBSITE_INTELLIGENCE_STATUS_VALUE[service.depth] * 0.5 +
        WEBSITE_INTELLIGENCE_STATUS_VALUE[service.structure] * 0.2;

      return total + serviceScore;
    }, 0) /
      assessment.serviceCoverage.length) *
    100;

  const combinedScore =
    dimensionScore * 0.7 + serviceCoverageScore * 0.3;

  return Math.max(0, Math.min(100, Math.round(combinedScore)));
}

function normalizeEvidenceSourceUrl(params: {
  sourceUrl: string | null;
  allowedSourceUrls: Set<string>;
}): string | null {
  if (!params.sourceUrl) {
    return null;
  }

  try {
    const normalized = new URL(params.sourceUrl).toString();

    return params.allowedSourceUrls.has(normalized) ? normalized : null;
  } catch {
    return null;
  }
}

function normalizeServiceComparisonKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b24\s*\/\s*7\b/g, "emergency")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(tree)\s+(?=pruning|trimming)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isInvalidLocalRelevanceGap(
  gap: WebsiteIntelligenceGap
): boolean {
  if (gap.type !== "LOCAL_RELEVANCE") {
    return false;
  }

  const combined = `${gap.summary} ${gap.whyItMatters} ${gap.evidence
    .map((item) => item.finding)
    .join(" ")}`
    .toLowerCase();

  const invalidSignals = [
    "community involvement",
    "community engagement",
    "local events",
    "charitable",
    "charity",
    "sponsorship",
    "sponsorships",
    "local history",
    "local stories",
  ];

  return invalidSignals.some((signal) =>
    combined.includes(signal)
  );
}

export function normalizeWebsiteIntelligenceAssessment(params: {
  assessment: WebsiteIntelligenceAssessment;
  website: string;
  allowedSourceUrls: string[];
  observedSignals: WebsiteIntelligenceObservedSignals;
  requiredServices?: string[];
}): WebsiteIntelligenceAssessment {
  const allowedSourceUrls = new Set(
    params.allowedSourceUrls.flatMap((url) => {
      try {
        const normalized = new URL(url).toString();
        return [normalized];
      } catch {
        return [];
      }
    })
  );

  function normalizeEvidence(
    evidence: WebsiteIntelligenceEvidence[]
  ): WebsiteIntelligenceEvidence[] {
    return evidence.map((item) => ({
      ...item,
      sourceUrl: normalizeEvidenceSourceUrl({
        sourceUrl: item.sourceUrl,
        allowedSourceUrls,
      }),
    }));
  }

  function normalizeDimension(
    dimension: WebsiteIntelligenceDimension
  ): WebsiteIntelligenceDimension {
    return {
      ...dimension,
      evidence: normalizeEvidence(dimension.evidence),
    };
  }

  const requiredServices = Array.from(
    new Map(
      (params.requiredServices ?? [])
        .map((service) => service.trim())
        .filter(Boolean)
        .map((service) => [service.toLowerCase(), service] as const)
    ).values()
  );

  const normalizedExistingServiceCoverage =
    params.assessment.serviceCoverage.map((service) => ({
      ...service,
      evidence: normalizeEvidence(service.evidence),
    }));

  const existingServiceKeys = new Set(
    normalizedExistingServiceCoverage.map((service) =>
      normalizeServiceComparisonKey(service.service)
    )
  );

  const missingRequiredServiceCoverage: WebsiteIntelligenceServiceCoverage[] =
    requiredServices
      .filter(
        (service) =>
            !existingServiceKeys.has(normalizeServiceComparisonKey(service))
      )
      .map((service) => ({
        service,
        presence: "INSUFFICIENT_EVIDENCE",
        depth: "INSUFFICIENT_EVIDENCE",
        structure: "INSUFFICIENT_EVIDENCE",
        summary:
          "MarketForge observed website signals for this service, but the current assessment did not return enough grounded evidence to evaluate it reliably.",
        evidence: [],
      }));

  const completeServiceCoverage = [
    ...normalizedExistingServiceCoverage,
    ...missingRequiredServiceCoverage,
  ];

  const normalized: WebsiteIntelligenceAssessment = {
    ...params.assessment,
    version: WEBSITE_INTELLIGENCE_VERSION,
    website: params.website,
    dimensions: {
      businessUnderstanding: normalizeDimension(
        params.assessment.dimensions.businessUnderstanding
      ),
      serviceAuthority: normalizeDimension(
        params.assessment.dimensions.serviceAuthority
      ),
      knowledgeDepth: normalizeDimension(
        params.assessment.dimensions.knowledgeDepth
      ),
      structuredClarity: normalizeDimension(
        params.assessment.dimensions.structuredClarity
      ),
      localRelevance: normalizeDimension(
        params.assessment.dimensions.localRelevance
      ),
      trustCredibility: normalizeDimension(
        params.assessment.dimensions.trustCredibility
      ),
      consistency: normalizeDimension(
        params.assessment.dimensions.consistency
      ),
    },
    serviceCoverage: completeServiceCoverage,
    observedSignals: params.observedSignals,
    strongestGaps: params.assessment.strongestGaps
        .filter((gap) => !isInvalidLocalRelevanceGap(gap))
        .map((gap) => ({
            ...gap,
            evidence: normalizeEvidence(gap.evidence),
        })),
    internalReadinessScore: 0,
  };

  return {
    ...normalized,
    internalReadinessScore:
      calculateWebsiteIntelligenceReadinessScore(normalized),
  };
}