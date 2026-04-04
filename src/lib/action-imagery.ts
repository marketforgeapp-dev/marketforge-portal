export type ActionImageMode = "SERVICE_IMAGE" | "SERVICE" | "LOGO";

type IndustryFolder = "plumbing" | "septic" | "tree-service" | "hvac";

function normalizeIndustryFolder(industry?: string | null): IndustryFolder {
  const value = (industry ?? "").toLowerCase();

  if (value.includes("septic")) return "septic";
  if (value.includes("tree")) return "tree-service";
  if (value.includes("hvac")) return "hvac";

  return "plumbing";
}

function normalizeKey(value?: string | null): string | null {
  if (!value) return null;

  return value
    .toLowerCase()
    .trim()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function normalizeServiceImageKey(value?: string | null): string | null {
  const normalized = normalizeKey(value);
  if (!normalized) return null;

  const aliases: Record<string, string> = {
    "water-heater-install": "water-heater-repair-replacement",
    "tankless-water-heater-install": "tankless-water-heater",
    "service-checkup": "general-plumbing",
    "company-logo": "fallback",
  };

  return aliases[normalized] ?? normalized;
}

function buildIndustryImagePath(
  industryFolder: IndustryFolder,
  imageKey: string
): string {
  return `/images/actions/${industryFolder}/${imageKey}.jpg`;
}

function buildIndustryFallbackPath(industryFolder: IndustryFolder): string {
  return `/images/actions/${industryFolder}/fallback.jpg`;
}

export function getActionImage(params: {
  industry?: string | null;
  workspaceIndustry?: string | null;
  familyKey?: string | null;
  imageKey?: string | null;
  imageMode?: ActionImageMode | null;
  logoUrl?: string | null;
}) {
const {
  industry,
  workspaceIndustry,
  familyKey,
  imageKey,
  imageMode,
  logoUrl,
} = params;

  const normalizedStoredIndustry = normalizeIndustryFolder(industry);
const normalizedWorkspaceIndustry = workspaceIndustry
  ? normalizeIndustryFolder(workspaceIndustry)
  : null;

const effectiveIndustry =
  normalizedStoredIndustry === "plumbing" &&
  normalizedWorkspaceIndustry &&
  normalizedWorkspaceIndustry !== "plumbing"
    ? workspaceIndustry
    : industry ?? workspaceIndustry ?? undefined;

const industryFolder = normalizeIndustryFolder(effectiveIndustry);

  if (imageMode === "LOGO") {
    return {
      src: logoUrl || buildIndustryFallbackPath(industryFolder),
      alt: "Company logo",
    };
  }

  const resolvedKey =
    normalizeServiceImageKey(imageKey) ??
    normalizeServiceImageKey(familyKey) ??
    "fallback";

const src = buildIndustryImagePath(industryFolder, resolvedKey);

console.log("IMAGE DEBUG →", {
  industry,
  industryFolder,
  familyKey,
  imageKey,
  imageMode,
  resolvedKey,
  src,
});

return {
  src,
  alt: resolvedKey.replace(/-/g, " "),
};

  return {
    src: buildIndustryImagePath(industryFolder, resolvedKey),
    alt: resolvedKey.replace(/-/g, " "),
  };
}