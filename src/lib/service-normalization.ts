import type { SupportedIndustry } from "@/lib/industry-service-map";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeComparable(value: string): string {
  return normalize(value).replace(/[^a-z0-9]+/g, " ").trim();
}

type CanonicalAliasMap = Record<string, string>;

const INDUSTRY_ALIAS_MAP: Record<SupportedIndustry, CanonicalAliasMap> = {
  PLUMBING: {
    "drain cleaning": "Drain cleaning",
    "drain clearing": "Drain cleaning",
    "clog removal": "Drain cleaning",
    "rooter service": "Drain cleaning",
    "hydro jetting": "Hydro jetting",
    "hydro jet": "Hydro jetting",
    "sewer jetting": "Hydro jetting",
    "water heater": "Water heater repair & replacement",
"water heater repair and replacement": "Water heater repair & replacement",
"water heater repair": "Water heater repair & replacement",
"water heater replacement": "Water heater repair & replacement",
"hot water heater repair": "Water heater repair & replacement",
"hot water heater replacement": "Water heater repair & replacement",
"water heater service": "Water heater service",
"water heater maintenance": "Water heater service",
"water heater flush": "Water heater service",
"water heater tune up": "Water heater service",
"tankless water heater": "Tankless water heater",
"tankless hot water heater": "Tankless water heater",
"tankless install": "Tankless water heater",
"tankless replacement": "Tankless water heater",
"tankless repair": "Tankless water heater",
"leak repair": "Leak repair",
"leak detection": "Leak repair",
"slab leak": "Slab leak repair",
"slab leak repair": "Slab leak repair",
"burst pipe": "Burst pipe repair",
"burst pipe repair": "Burst pipe repair",
"toilet repair and replacement": "Toilet repair",
"garbage disposal": "Garbage disposal repair & installation",
"garbage disposal repair": "Garbage disposal repair & installation",
"garbage disposal installation": "Garbage disposal repair & installation",
"garbage disposal repair and installation":
  "Garbage disposal repair & installation",
"disposal repair": "Garbage disposal repair & installation",
"disposal installation": "Garbage disposal repair & installation",
"water softener": "Water softener installation",
"water softener installation": "Water softener installation",
"water softener install": "Water softener installation",
"softener installation": "Water softener installation",
"custom home plumbing installation": "Custom home plumbing installation",
"custom home plumbing": "Custom home plumbing installation",
"new construction plumbing": "Custom home plumbing installation",
"new build plumbing": "Custom home plumbing installation",
"rough in plumbing": "Custom home plumbing installation",
    "toilet repair": "Toilet repair",
    "toilet replacement": "Toilet repair",
    "faucets fixtures": "Faucets & fixtures",
    "faucets and fixtures": "Faucets & fixtures",
    "faucet repair": "Faucets & fixtures",
    "fixture repair": "Faucets & fixtures",
    "sump pump": "Sump pump repair",
    "sump pump repair": "Sump pump repair",
    "sump pump replacement": "Sump pump repair",
    "sewer line": "Sewer line service",
    "sewer line repair": "Sewer line service",
    "sewer line replacement": "Sewer line service",
    "main line repair": "Sewer line service",
    "main line replacement": "Sewer line service",
    "sewer camera": "Sewer camera inspection",
    "camera inspection": "Sewer camera inspection",
    "sewer camera inspection": "Sewer camera inspection",
    "gas line": "Gas line service",
    "gas line repair": "Gas line service",
    "gas line replacement": "Gas line service",
    repiping: "Repiping",
    repipe: "Repiping",
    "whole home repipe": "Repiping",
    "general plumbing": "General plumbing",
    plumber: "General plumbing",
    "plumbing service": "General plumbing",
  },

  SEPTIC: {
    "septic tank pumping": "Septic tank pumping",
    "septic pumping": "Septic tank pumping",
    "tank pumping": "Septic tank pumping",
    "septic cleaning": "Septic tank pumping",
    "septic inspection": "Septic system inspection",
    "system inspection": "Septic system inspection",
    "point of sale inspection": "Septic system inspection",
    "sludge level inspection": "Septic system inspection",
    "septic installation": "Septic system installation",
    "septic system installation": "Septic system installation",
    "new septic system": "Septic system installation",
    "drain field repair": "Drain field repair",
    "leach field repair": "Drain field repair",
    "drain field replacement": "Drain field repair",
    "sewer line repair": "Sewer line repair & replacement",
    "sewer line replacement": "Sewer line repair & replacement",
    "main line repair": "Sewer line repair & replacement",
    "main line replacement": "Sewer line repair & replacement",
    "lift pump service": "Lift pump service",
    "lift pump repair": "Lift pump service",
    "effluent pump repair": "Lift pump service",
    "grease trap cleaning": "Grease trap cleaning",
    "grease trap service": "Grease trap cleaning",
    "riser installation": "Riser & lid installation",
    "lid installation": "Riser & lid installation",
    "riser and lid": "Riser & lid installation",
        "septic repair": "Septic repair",
    "septic tank repair": "Septic repair",
    "septic system repair": "Septic repair",
    "baffle repair": "Septic repair",
    "tank repair": "Septic repair",
    "septic maintenance": "Septic maintenance",
    "system maintenance": "Septic maintenance",
    "annual septic maintenance": "Septic maintenance",
    "septic tune up": "Septic maintenance",
    "maintenance plan": "Septic maintenance",
    "emergency septic": "Emergency septic service",
    "emergency septic service": "Emergency septic service",
    "septic backup": "Emergency septic service",
    "septic overflow": "Emergency septic service",
    "sewage backup": "Emergency septic service",
  },

  TREE_SERVICE: {
    "tree removal": "Tree removal",
    "hazardous tree removal": "Tree removal",
    "tree trimming": "Pruning & trimming",
    "tree pruning": "Pruning & trimming",
    "canopy lifting": "Pruning & trimming",
    "stump grinding": "Stump grinding",
    "stump removal": "Stump grinding",
    "storm cleanup": "Emergency storm service",
    "emergency storm service": "Emergency storm service",
    "fallen tree removal": "Emergency storm service",
    "plant health care": "Plant health care",
    fertilization: "Plant health care",
    "deep root feeding": "Plant health care",
    "disease treatment": "Disease & pest management",
    "pest management": "Disease & pest management",
    "tree disease treatment": "Disease & pest management",
    "arborist consultation": "Arborist consultations",
    "tree risk assessment": "Arborist consultations",
    "arborist report": "Arborist consultations",
    "lot clearing": "Lot clearing",
    "land clearing": "Lot clearing",
        "tree planting": "Tree planting & transplanting",
    "tree transplanting": "Tree planting & transplanting",
    "tree installation": "Tree planting & transplanting",
    "plant a tree": "Tree planting & transplanting",
    "transplant tree": "Tree planting & transplanting",
    "tree cabling": "Tree cabling & bracing",
    "tree bracing": "Tree cabling & bracing",
    "tree support system": "Tree cabling & bracing",
    "tree support systems": "Tree cabling & bracing",
    "structural support": "Tree cabling & bracing",
    "brush removal": "Brush removal & debris hauling",
    "debris hauling": "Brush removal & debris hauling",
    "yard debris removal": "Brush removal & debris hauling",
    "brush hauling": "Brush removal & debris hauling",
    "tree debris cleanup": "Brush removal & debris hauling",
  },

  HVAC: {
    "ac repair": "AC repair",
    "air conditioning repair": "AC repair",
    "cooling repair": "AC repair",
    "heating repair": "Heating repair",
    "furnace repair": "Heating repair",
    "heat pump repair": "Heating repair",
    "hvac maintenance": "HVAC maintenance",
    "ac tune up": "HVAC maintenance",
    "furnace tune up": "HVAC maintenance",
    "seasonal maintenance": "HVAC maintenance",
    "system replacement": "System replacement",
    "hvac replacement": "System replacement",
    "ac replacement": "System replacement",
    "furnace replacement": "System replacement",
  },
};

function titleCase(value: string): string {
  return value
    .split(" ")
    .map((part) =>
      part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part
    )
    .join(" ");
}

export function normalizeServiceNameForIndustry(
  raw: string,
  industry: SupportedIndustry
): string {
  const comparable = normalizeComparable(raw);
  const aliasMap = INDUSTRY_ALIAS_MAP[industry] ?? {};
  return aliasMap[comparable] ?? titleCase(comparable);
}

export function dedupeServicesForIndustry(
  services: string[],
  industry: SupportedIndustry
): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const service of services) {
    const normalizedService = normalizeServiceNameForIndustry(service, industry);
    const key = normalizeComparable(normalizedService);

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(normalizedService);
  }

  return output;
}

export function mergeAndDedupeServicesForIndustry(params: {
  industry: SupportedIndustry;
  groups: string[][];
  max?: number;
}): string[] {
  const combined = params.groups.flat().filter(Boolean);
  const deduped = dedupeServicesForIndustry(combined, params.industry);

  if (typeof params.max === "number") {
    return deduped.slice(0, params.max);
  }

  return deduped;
}