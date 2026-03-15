import { BusinessProfile } from "@/generated/prisma";
import {
  getBlueprintForFamily,
  getServiceFamilyKey,
  isFamilyCompatibleWithIndustry,
  type SupportedIndustry,
} from "@/lib/industry-service-map";
import { getProfileIndustry } from "@/lib/canonical-services";

export type ServicePricingRow = {
  serviceName: string;
  averageRevenue: number | null;
};

export type ServicePricingCandidate = {
  familyKey: string;
  serviceName: string;
  actionThesisPrimaryService?: string | null;
  industry?: SupportedIndustry;
};

export function normalizePricingKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function parseServicePricing(profile: BusinessProfile): ServicePricingRow[] {
  const raw = (profile as BusinessProfile & { servicePricingJson?: unknown })
    .servicePricingJson;

  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .filter(
      (item) => typeof item === "object" && item !== null && !Array.isArray(item)
    )
    .map((item) => {
      const record = item as Record<string, unknown>;

      return {
        serviceName:
          typeof record.serviceName === "string" ? record.serviceName.trim() : "",
        averageRevenue:
          typeof record.averageRevenue === "number" &&
          Number.isFinite(record.averageRevenue)
            ? record.averageRevenue
            : null,
      };
    })
    .filter((item) => item.serviceName.length > 0);
}

function resolveIndustry(
  profile: BusinessProfile,
  candidate: ServicePricingCandidate
): SupportedIndustry {
  if (candidate.industry) {
    return candidate.industry;
  }

  return getProfileIndustry(profile);
}

function buildCandidatePricingKeys(
  candidate: ServicePricingCandidate,
  industry: SupportedIndustry
): Set<string> {
  const blueprint = getBlueprintForFamily(candidate.familyKey, industry);

  return new Set(
    [
      candidate.serviceName,
      candidate.actionThesisPrimaryService ?? "",
      blueprint.serviceName,
      ...blueprint.aliases,
    ]
      .filter(Boolean)
      .map(normalizePricingKey)
  );
}

export function getServiceLevelJobValue(params: {
  profile: BusinessProfile;
  candidate: ServicePricingCandidate;
}): number | null {
  const pricingRows = parseServicePricing(params.profile);
  if (pricingRows.length === 0) return null;

  const industry = resolveIndustry(params.profile, params.candidate);
  const candidateFamilyKey = params.candidate.familyKey;
  const candidateKeys = buildCandidatePricingKeys(params.candidate, industry);

  for (const row of pricingRows) {
    if (
      typeof row.averageRevenue !== "number" ||
      !Number.isFinite(row.averageRevenue) ||
      row.averageRevenue <= 0
    ) {
      continue;
    }

    const rowKey = normalizePricingKey(row.serviceName);
    const rowFamilyKey = getServiceFamilyKey(row.serviceName, industry);

    if (!isFamilyCompatibleWithIndustry(rowFamilyKey, industry)) {
      continue;
    }

    const directMatch =
      candidateKeys.has(rowKey) ||
      Array.from(candidateKeys).some(
        (candidateKey) =>
          candidateKey.includes(rowKey) || rowKey.includes(candidateKey)
      );

    const familyMatch = rowFamilyKey === candidateFamilyKey;

    if (directMatch || familyMatch) {
      return row.averageRevenue;
    }
  }

  return null;
}

export function resolveServiceJobValue(params: {
  profile: BusinessProfile;
  candidate: ServicePricingCandidate;
  fallbackJobValue?: number | null;
}): number {
  const serviceLevelValue = getServiceLevelJobValue({
    profile: params.profile,
    candidate: params.candidate,
  });

  if (
    typeof serviceLevelValue === "number" &&
    Number.isFinite(serviceLevelValue) &&
    serviceLevelValue > 0
  ) {
    return serviceLevelValue;
  }

  const profileAverageJobValue = params.profile.averageJobValue;

  if (
    typeof profileAverageJobValue === "number" &&
    Number.isFinite(profileAverageJobValue) &&
    profileAverageJobValue > 0
  ) {
    return profileAverageJobValue;
  }

  if (
    typeof params.fallbackJobValue === "number" &&
    Number.isFinite(params.fallbackJobValue) &&
    params.fallbackJobValue > 0
  ) {
    return params.fallbackJobValue;
  }

  return 450;
}