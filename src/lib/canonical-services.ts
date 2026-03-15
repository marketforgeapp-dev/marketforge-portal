import { BusinessProfile } from "@/generated/prisma";
import {
  getBlueprintForFamily,
  getServiceFamilyKey,
  getSupportedIndustryFromProfile,
  type ServiceBlueprint,
  type SupportedIndustry,
} from "@/lib/industry-service-map";

export type CanonicalService = {
  rawName: string;
  canonicalName: string;
  familyKey: string;
  industry: SupportedIndustry;
  blueprint: ServiceBlueprint;
  isPreferred: boolean;
  isDeprioritized: boolean;
  isHighestMargin: boolean;
  isLowestPriority: boolean;
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))
  );
}

export function getProfileIndustry(profile: Pick<
  BusinessProfile,
  "industryLabel" | "preferredServices" | "businessName"
>): SupportedIndustry {
  return getSupportedIndustryFromProfile({
    industryLabel: profile.industryLabel,
    preferredServices: profile.preferredServices,
    businessName: profile.businessName,
  });
}

export function hasStrongAeoBaseline(
  profile: Pick<
    BusinessProfile,
    | "hasFaqContent"
    | "hasServicePages"
    | "hasGoogleBusinessPage"
    | "aeoReadinessScore"
    | "servicePageUrls"
  >
): boolean {
  return Boolean(
    profile.hasFaqContent &&
      profile.hasServicePages &&
      profile.hasGoogleBusinessPage &&
      (profile.aeoReadinessScore ?? 0) >= 90 &&
      (profile.servicePageUrls?.length ?? 0) >= 4
  );
}

export function buildCanonicalServices(profile: BusinessProfile): CanonicalService[] {
  const industry = getProfileIndustry(profile);

  const preferred = uniqueStrings(profile.preferredServices ?? []);
  const deprioritized = uniqueStrings(profile.deprioritizedServices ?? []);

  const rawInputs = uniqueStrings([
    ...preferred,
    ...deprioritized,
    profile.highestMarginService ?? "",
    profile.lowestPriorityService ?? "",
  ]);

  const byFamily = new Map<string, CanonicalService>();

  for (const rawName of rawInputs) {
    const familyKey = getServiceFamilyKey(rawName, industry);
    const blueprint = getBlueprintForFamily(familyKey, industry);

    const existing = byFamily.get(familyKey);

    const candidate: CanonicalService = {
      rawName,
      canonicalName: blueprint.serviceName,
      familyKey,
      industry,
      blueprint,
      isPreferred: preferred.some(
        (service) => getServiceFamilyKey(service, industry) === familyKey
      ),
      isDeprioritized: deprioritized.some(
        (service) => getServiceFamilyKey(service, industry) === familyKey
      ),
      isHighestMargin:
        normalize(profile.highestMarginService ?? "") === normalize(rawName) ||
        getServiceFamilyKey(profile.highestMarginService ?? "", industry) === familyKey,
      isLowestPriority:
        normalize(profile.lowestPriorityService ?? "") === normalize(rawName) ||
        getServiceFamilyKey(profile.lowestPriorityService ?? "", industry) === familyKey,
    };

    if (!existing) {
      byFamily.set(familyKey, candidate);
      continue;
    }

    byFamily.set(familyKey, {
      ...existing,
      rawName:
        existing.isPreferred || !candidate.isPreferred ? existing.rawName : candidate.rawName,
      isPreferred: existing.isPreferred || candidate.isPreferred,
      isDeprioritized: existing.isDeprioritized || candidate.isDeprioritized,
      isHighestMargin: existing.isHighestMargin || candidate.isHighestMargin,
      isLowestPriority: existing.isLowestPriority || candidate.isLowestPriority,
    });
  }

  return Array.from(byFamily.values());
}