import type {
  WebsiteIntelligenceAssessment,
  WebsiteIntelligenceEvidence,
  WebsiteIntelligenceGap,
  WebsiteIntelligenceGapType,
  WebsiteIntelligenceServiceCoverage,
  WebsiteIntelligenceStatus,
} from "@/lib/website-intelligence";

export type WebsiteIntelligenceRecommendationExecutionType =
  | "MARKETFORGE_EXECUTABLE"
  | "GUIDED_IMPLEMENTATION";

export type WebsiteIntelligenceRecommendationKind =
  | "AUTHORITY_CONTENT"
  | "SERVICE_CONTENT_IMPROVEMENT"
  | "SERVICE_PAGE_STRUCTURE"
  | "SITE_STRUCTURE"
  | "BUSINESS_CLARITY"
  | "LOCAL_RELEVANCE"
  | "TRUST_CREDIBILITY"
  | "CONSISTENCY";

export type WebsiteIntelligenceRecommendation = {
  id: string;

  priority: number;

  gapType: WebsiteIntelligenceGapType;
  service: string | null;

  executionType: WebsiteIntelligenceRecommendationExecutionType;
  kind: WebsiteIntelligenceRecommendationKind;

  title: string;
  summary: string;
  whyItMatters: string;
  recommendedImprovement: string;

  evidence: WebsiteIntelligenceEvidence[];
};

function normalizeComparisonKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatServicePrefix(service: string | null): string {
  if (!service) {
    return "";
  }

  return `${service}: `;
}

function findServiceCoverage(
  assessment: WebsiteIntelligenceAssessment,
  service: string | null
): WebsiteIntelligenceServiceCoverage | null {
  if (!service) {
    return null;
  }

  const targetKey = normalizeComparisonKey(service);

  return (
    assessment.serviceCoverage.find(
      (item) => normalizeComparisonKey(item.service) === targetKey
    ) ?? null
  );
}

function statusIsWeak(
  status: WebsiteIntelligenceStatus
): boolean {
  return status === "WEAK";
}

function statusHasUsableEvidence(
  status: WebsiteIntelligenceStatus
): boolean {
  return (
    status === "STRONG" ||
    status === "PARTIAL" ||
    status === "WEAK"
  );
}

function classifyServiceAuthorityRecommendation(params: {
  gap: WebsiteIntelligenceGap;
  serviceCoverage: WebsiteIntelligenceServiceCoverage | null;
}): {
  executionType: WebsiteIntelligenceRecommendationExecutionType;
  kind: WebsiteIntelligenceRecommendationKind;
} {
  const { serviceCoverage } = params;

  if (!serviceCoverage) {
    return {
      executionType: "GUIDED_IMPLEMENTATION",
      kind: "SERVICE_PAGE_STRUCTURE",
    };
  }

  const structureNeedsWork =
    statusIsWeak(serviceCoverage.structure) ||
    serviceCoverage.structure === "INSUFFICIENT_EVIDENCE";

  const presenceNeedsWork =
    statusIsWeak(serviceCoverage.presence) ||
    serviceCoverage.presence === "INSUFFICIENT_EVIDENCE";

  if (structureNeedsWork || presenceNeedsWork) {
    return {
      executionType: "GUIDED_IMPLEMENTATION",
      kind: "SERVICE_PAGE_STRUCTURE",
    };
  }

  if (
    statusHasUsableEvidence(serviceCoverage.depth) &&
    serviceCoverage.depth !== "STRONG"
  ) {
    return {
      executionType: "MARKETFORGE_EXECUTABLE",
      kind: "SERVICE_CONTENT_IMPROVEMENT",
    };
  }

  return {
    executionType: "GUIDED_IMPLEMENTATION",
    kind: "SERVICE_PAGE_STRUCTURE",
  };
}

function classifyRecommendation(params: {
  gap: WebsiteIntelligenceGap;
  assessment: WebsiteIntelligenceAssessment;
}): {
  executionType: WebsiteIntelligenceRecommendationExecutionType;
  kind: WebsiteIntelligenceRecommendationKind;
} {
  const { gap, assessment } = params;

  if (gap.type === "KNOWLEDGE_DEPTH") {
    return {
      executionType: "MARKETFORGE_EXECUTABLE",
      kind: "AUTHORITY_CONTENT",
    };
  }

  if (gap.type === "SERVICE_AUTHORITY") {
    return classifyServiceAuthorityRecommendation({
      gap,
      serviceCoverage: findServiceCoverage(
        assessment,
        gap.service
      ),
    });
  }

  if (gap.type === "STRUCTURED_CLARITY") {
    return {
      executionType: "GUIDED_IMPLEMENTATION",
      kind: "SITE_STRUCTURE",
    };
  }

  if (gap.type === "BUSINESS_UNDERSTANDING") {
    return {
      executionType: "GUIDED_IMPLEMENTATION",
      kind: "BUSINESS_CLARITY",
    };
  }

  if (gap.type === "LOCAL_RELEVANCE") {
    return {
      executionType: "GUIDED_IMPLEMENTATION",
      kind: "LOCAL_RELEVANCE",
    };
  }

  if (gap.type === "TRUST_CREDIBILITY") {
    return {
      executionType: "GUIDED_IMPLEMENTATION",
      kind: "TRUST_CREDIBILITY",
    };
  }

  return {
    executionType: "GUIDED_IMPLEMENTATION",
    kind: "CONSISTENCY",
  };
}

function buildRecommendationCopy(params: {
  gap: WebsiteIntelligenceGap;
  assessment: WebsiteIntelligenceAssessment;
  executionType: WebsiteIntelligenceRecommendationExecutionType;
  kind: WebsiteIntelligenceRecommendationKind;
}): {
  title: string;
  recommendedImprovement: string;
} {
  const {
    gap,
    assessment,
    executionType,
    kind,
  } = params;

  const servicePrefix = formatServicePrefix(gap.service);

  if (kind === "AUTHORITY_CONTENT") {
    return {
      title: `${servicePrefix}Build deeper website authority`,
      recommendedImprovement:
        "Create substantive educational content that answers real customer questions and demonstrates useful expertise beyond basic service descriptions. MarketForge can prepare the authority content for review and execution.",
    };
  }

  if (kind === "SERVICE_CONTENT_IMPROVEMENT") {
    return {
      title: `${servicePrefix}Strengthen service authority`,
      recommendedImprovement:
        "Expand the existing service content with clearer explanations, customer questions, decision guidance, and evidence of expertise. MarketForge can prepare the content needed to strengthen the current service coverage.",
    };
  }

  if (kind === "SERVICE_PAGE_STRUCTURE") {
    return {
      title: `${servicePrefix}Create a stronger service-page foundation`,
      recommendedImprovement:
        "Give this service a clearer, more complete website presence. MarketForge should prepare the recommended page structure, content requirements, SEO guidance, internal-link plan, and supporting copy so the website change can be implemented with minimal additional planning.",
    };
  }

  if (kind === "SITE_STRUCTURE") {
    return {
      title: "Improve how the website is organized",
      recommendedImprovement:
        "Create a clearer website structure so important services, expertise, and answers are easier for customers and search systems to understand. MarketForge should prepare the recommended page architecture, internal links, content requirements, and implementation instructions.",
    };
  }

  if (kind === "BUSINESS_CLARITY") {
    return {
      title: "Make the business easier to understand",
      recommendedImprovement:
        "Clarify what the business does, who it serves, and how its core services are presented across important website pages. MarketForge should provide the messaging and page-level implementation guidance needed to make that understanding more consistent.",
    };
  }

  if (kind === "LOCAL_RELEVANCE") {
    const locations =
      assessment.observedSignals.detectedServiceAreaLocations;

    return {
      title: "Strengthen local relevance",
      recommendedImprovement:
        locations.length > 0
          ? "Strengthen the connection between core services and the locations the business actually serves. MarketForge should provide location-aware content guidance, internal-link recommendations, and page changes without inventing unsupported local claims."
          : "Make the actual service area clearer across the website. MarketForge should provide location-aware content guidance and page recommendations without inventing locations or unsupported local claims.",
    };
  }

  if (kind === "TRUST_CREDIBILITY") {
    return {
      title: "Strengthen trust and credibility signals",
      recommendedImprovement:
        "Make existing proof of credibility easier to find and understand across important pages. MarketForge should identify where verified reviews, qualifications, experience, guarantees, or other supported trust signals should appear without inventing claims the website does not support.",
    };
  }

  return {
    title: "Improve website consistency",
    recommendedImprovement:
      "Align important business, service, location, and credibility information across the website so customers and search systems receive a consistent understanding of the business. MarketForge should provide the specific consistency issues and implementation guidance needed to resolve them.",
  };
}

function buildRecommendation(params: {
  assessment: WebsiteIntelligenceAssessment;
  gap: WebsiteIntelligenceGap;
  priority: number;
}): WebsiteIntelligenceRecommendation {
  const { assessment, gap, priority } = params;

  const classification = classifyRecommendation({
    gap,
    assessment,
  });

  const copy = buildRecommendationCopy({
    gap,
    assessment,
    executionType: classification.executionType,
    kind: classification.kind,
  });

  return {
    id: [
      "website-intelligence",
      priority,
      gap.type.toLowerCase(),
      normalizeComparisonKey(gap.service ?? "general").replace(
        /\s+/g,
        "-"
      ),
    ].join("-"),

    priority,

    gapType: gap.type,
    service: gap.service,

    executionType: classification.executionType,
    kind: classification.kind,

    title: copy.title,
    summary: gap.summary,
    whyItMatters: gap.whyItMatters,
    recommendedImprovement: copy.recommendedImprovement,

    evidence: gap.evidence,
  };
}

export function buildWebsiteIntelligenceRecommendations(
  assessment: WebsiteIntelligenceAssessment
): WebsiteIntelligenceRecommendation[] {
  return assessment.strongestGaps
    .slice(0, 3)
    .map((gap, index) =>
      buildRecommendation({
        assessment,
        gap,
        priority: index + 1,
      })
    );
}