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

type IndexedPricingRow = {
  row: ServicePricingRow;
  normalizedServiceName: string;
  familyKey: string;
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

function getValidPricingRows(
  profile: BusinessProfile,
  industry: SupportedIndustry
): IndexedPricingRow[] {
  return parseServicePricing(profile)
    .filter(
      (row) =>
        typeof row.averageRevenue === "number" &&
        Number.isFinite(row.averageRevenue) &&
        row.averageRevenue > 0
    )
    .map((row) => {
      const familyKey = getServiceFamilyKey(row.serviceName, industry);

      return {
        row,
        normalizedServiceName: normalizePricingKey(row.serviceName),
        familyKey,
      };
    })
    .filter((row) => isFamilyCompatibleWithIndustry(row.familyKey, industry));
}

function buildExactCandidateKeys(
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

function findExactServiceNameMatch(params: {
  pricingRows: IndexedPricingRow[];
  candidateKeys: Set<string>;
  candidateFamilyKey: string;
}): IndexedPricingRow | null {
  const { pricingRows, candidateKeys, candidateFamilyKey } = params;

  for (const row of pricingRows) {
    if (
      row.familyKey === candidateFamilyKey &&
      candidateKeys.has(row.normalizedServiceName)
    ) {
      return row;
    }
  }

  return null;
}

function findExactBlueprintMatch(params: {
  pricingRows: IndexedPricingRow[];
  candidateFamilyKey: string;
  industry: SupportedIndustry;
}): IndexedPricingRow | null {
  const { pricingRows, candidateFamilyKey, industry } = params;
  const blueprint = getBlueprintForFamily(candidateFamilyKey, industry);
  const blueprintKey = normalizePricingKey(blueprint.serviceName);

  return (
    pricingRows.find(
      (row) =>
        row.familyKey === candidateFamilyKey &&
        row.normalizedServiceName === blueprintKey
    ) ?? null
  );
}

function findSingleFamilyFallback(params: {
  pricingRows: IndexedPricingRow[];
  candidateFamilyKey: string;
}): IndexedPricingRow | null {
  const familyRows = params.pricingRows.filter(
    (row) => row.familyKey === params.candidateFamilyKey
  );

  if (familyRows.length === 1) {
    return familyRows[0];
  }

  return null;
}

export function getServiceLevelJobValue(params: {
  profile: BusinessProfile;
  candidate: ServicePricingCandidate;
}): number | null {
  const industry = resolveIndustry(params.profile, params.candidate);
  const pricingRows = getValidPricingRows(params.profile, industry);

  if (pricingRows.length === 0) {
    return null;
  }

  const candidateFamilyKey = params.candidate.familyKey;
  const candidateKeys = buildExactCandidateKeys(params.candidate, industry);

  const exactServiceNameMatch = findExactServiceNameMatch({
    pricingRows,
    candidateKeys,
    candidateFamilyKey,
  });

  if (exactServiceNameMatch) {
    return exactServiceNameMatch.row.averageRevenue;
  }

  const exactBlueprintMatch = findExactBlueprintMatch({
    pricingRows,
    candidateFamilyKey,
    industry,
  });

  if (exactBlueprintMatch) {
    return exactBlueprintMatch.row.averageRevenue;
  }

  const singleFamilyFallback = findSingleFamilyFallback({
    pricingRows,
    candidateFamilyKey,
  });

  if (singleFamilyFallback) {
    return singleFamilyFallback.row.averageRevenue;
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