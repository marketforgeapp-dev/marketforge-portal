import type { SupportedIndustry } from "@/lib/industry-service-map";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeComparable(value: string): string {
  let normalized = normalize(value);

  normalized = normalized.replace(/&/g, " and ");
  normalized = normalized.replace(/\b24\s*\/\s*7\b/g, "24 7");
  normalized = normalized.replace(/\b24\s*-\s*7\b/g, "24 7");
  normalized = normalized.replace(/\bre\s*pipe(?:s|ing)?\b/g, "repiping");
  normalized = normalized.replace(/\brepipe(?:s|ing)?\b/g, "repiping");
  normalized = normalized.replace(/[^a-z0-9]+/g, " ").trim();
  normalized = normalized.replace(/\s+/g, " ").trim();

  return normalized;
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

    "repiping": "Repiping",
    "repipe": "Repiping",
    "repipes": "Repiping",
    "whole home repipe": "Repiping",

    "24 7 emergency service": "Emergency plumbing",
    "24 7 emergency plumbing": "Emergency plumbing",
    "24 hour plumber": "Emergency plumbing",
    "after hours plumbing": "Emergency plumbing",
    "emergency plumber": "Emergency plumbing",
    "emergency plumbing service": "Emergency plumbing",
    "emergency plumbing": "Emergency plumbing",

    "general plumbing": "General plumbing",
    "plumber": "General plumbing",
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

    "24 7 emergency service": "Emergency septic service",
    "emergency service": "Emergency septic service",
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
    "tree pruning service": "Pruning & trimming",

    "stump grinding": "Stump grinding",
    "stump removal": "Stump grinding",

    "24 7 emergency service": "Emergency storm service",
    "emergency service": "Emergency storm service",
    "emergency tree service": "Emergency storm service",
    "storm service": "Emergency storm service",
    "storm cleanup": "Emergency storm service",
    "emergency storm service": "Emergency storm service",
    "fallen tree removal": "Emergency storm service",
    "storm damage tree service": "Emergency storm service",

    "plant health care": "Plant health care",
    "fertilization": "Plant health care",
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
    "residential hvac": "General HVAC",
    "residential hvac service": "General HVAC",
    "residential hvac services": "General HVAC",
    "residential hvac repair": "General HVAC",
    "residential hvac repairs": "General HVAC",
    "residential hvac installation": "HVAC installation",
    "residential hvac installation and repair": "HVAC repair",
    "residential hvac installation and repairs": "HVAC repair",

    "commercial hvac": "General HVAC",
    "commercial hvac service": "General HVAC",
    "commercial hvac services": "General HVAC",
    "commercial hvac solutions": "General HVAC",
    "commercial heating and cooling": "General HVAC",

    "new construction hvac": "General HVAC",
    "new construction hvac service": "General HVAC",
    "new construction hvac services": "General HVAC",
    "new construction heating and cooling": "General HVAC",

    "heating and cooling": "General HVAC",
    "heating cooling": "General HVAC",
    "home comfort": "General HVAC",
    "home comfort solutions": "General HVAC",
    "hvac services": "General HVAC",
    "hvac service": "General HVAC",

    "ac repair": "AC repair",
    "air conditioning repair": "AC repair",
    "cooling repair": "AC repair",

    "ac replacement": "AC replacement",
    "air conditioner replacement": "AC replacement",
    "air conditioning replacement": "AC replacement",
    "ac install": "AC replacement",
    "ac installation": "AC replacement",

    "furnace repair": "Furnace repair",
    "heating repair": "Furnace repair",
    "heater repair": "Furnace repair",
    "heat repair": "Furnace repair",

    "furnace installation": "Furnace installation",
    "furnace install": "Furnace installation",
    "furnace replacement": "Furnace installation",
    "heater installation": "Furnace installation",
    "heater replacement": "Furnace installation",

    "hvac repair": "HVAC repair",
    "hvac repairs": "HVAC repair",
    "hvac service repair": "HVAC repair",
    "hvac service repairs": "HVAC repair",
    "repair hvac": "HVAC repair",
    "prompt dependable part updates and repairs to address hvac issues": "HVAC repair",
    "prompt dependaple part updates and repairs to address hvac issues": "HVAC repair",

    "hvac installation": "HVAC installation",
    "hvac installations": "HVAC installation",
    "hvac install": "HVAC installation",
    "hvac installs": "HVAC installation",
    "hvac installation service": "HVAC installation",
    "hvac installation services": "HVAC installation",
    "installation and maintenance": "HVAC installation",
    "installation and maintenance to repair and air quality improvements": "HVAC installation",
    "installation maintenance repair and air quality improvements": "HVAC installation",

    "hvac maintenance": "HVAC maintenance",
    "hvac maintenance service": "HVAC maintenance",
    "hvac maintenance services": "HVAC maintenance",
    "heating and cooling maintenance": "HVAC maintenance",
    "furnace and air conditioning maintenance": "HVAC maintenance",
    "preventative maintenance": "HVAC maintenance",
    "preventive maintenance": "HVAC maintenance",
    "routine maintenance": "HVAC maintenance",

    "emergency hvac": "Emergency HVAC",
    "emergency hvac service": "Emergency HVAC",
    "emergency hvac services": "Emergency HVAC",
    "emergency heating and cooling": "Emergency HVAC",
    "emergency repair": "Emergency HVAC",
    "emergency repairs": "Emergency HVAC",
    "24 7 hvac": "Emergency HVAC",
    "24 hour hvac": "Emergency HVAC",
    "after hours hvac": "Emergency HVAC",
    "emergency service": "Emergency HVAC",

    "no heat": "No heat / no AC",
    "no ac": "No heat / no AC",
    "no cooling": "No heat / no AC",
    "ac not working": "No heat / no AC",
    "heat not working": "No heat / no AC",
    "furnace not working": "No heat / no AC",

    "seasonal tune up": "Seasonal tune-ups",
    "seasonal tune ups": "Seasonal tune-ups",
    "ac tune up": "Seasonal tune-ups",
    "furnace tune up": "Seasonal tune-ups",
    "hvac tune up": "Seasonal tune-ups",
    "system tune up": "Seasonal tune-ups",
    "seasonal maintenance": "Seasonal tune-ups",

    "maintenance plan": "Maintenance plans",
    "maintenance plans": "Maintenance plans",
    "maintenance agreement": "Maintenance plans",
    "maintenance agreements": "Maintenance plans",
    "service agreement": "Maintenance plans",
    "service agreements": "Maintenance plans",
    "hvac maintenance plan": "Maintenance plans",
    "hvac service plan": "Maintenance plans",

    "indoor air quality": "Indoor air quality",
    "indoor air quality improvement": "Indoor air quality",
    "indoor air quality improvements": "Indoor air quality",
    "indoor air quality service": "Indoor air quality",
    "indoor air quality services": "Indoor air quality",
    "indoor air quality solution": "Indoor air quality",
    "indoor air quality solutions": "Indoor air quality",
    "air quality": "Indoor air quality",
    "air quality improvement": "Indoor air quality",
    "air quality improvements": "Indoor air quality",
    "air quality service": "Indoor air quality",
    "air quality services": "Indoor air quality",
    "iaq": "Indoor air quality",
    "iaq service": "Indoor air quality",
    "iaq services": "Indoor air quality",
    "iaq solution": "Indoor air quality",
    "iaq solutions": "Indoor air quality",
    "air purifier": "Indoor air quality",
    "air purification": "Indoor air quality",
    "whole home air purifier": "Indoor air quality",
    "humidity control": "Indoor air quality",
    "dehumidifier": "Indoor air quality",

    "duct cleaning": "Duct cleaning & sealing",
    "duct sealing": "Duct cleaning & sealing",
    "duct cleaning and sealing": "Duct cleaning & sealing",
    "ductwork cleaning": "Duct cleaning & sealing",
    "ductwork sealing": "Duct cleaning & sealing",
    "ductwork cleaning and care": "Duct cleaning & sealing",
    "duct cleaning and care": "Duct cleaning & sealing",
    "air duct cleaning": "Duct cleaning & sealing",
    "duct care": "Duct cleaning & sealing",

    "heat pump": "Heat pump service",
    "heat pump repair": "Heat pump service",
    "heat pump installation": "Heat pump service",
    "heat pump replacement": "Heat pump service",
    "heat pump service": "Heat pump service",

    "ductless mini split service": "Ductless mini-split service",
    "ductless mini split repair": "Ductless mini-split service",
    "mini split service": "Ductless mini-split service",
    "mini split repair": "Ductless mini-split service",

    "ductless mini split installation": "Ductless mini-split installation",
    "ductless mini split install": "Ductless mini-split installation",
    "mini split installation": "Ductless mini-split installation",
    "mini split install": "Ductless mini-split installation",
  }};

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

function expandServicesForIndustry(
  services: string[],
  industry: SupportedIndustry
): string[] {
  if (industry !== "HVAC") {
    return services;
  }

  const expanded: string[] = [];

  for (const service of services) {
    const comparable = normalizeComparable(service);
    if (!comparable) continue;

    const additions = new Set<string>();

    additions.add(service);

    const mentionsHvac =
      comparable.includes("hvac") ||
      comparable.includes("heating and cooling") ||
      comparable.includes("home comfort");

    if (
      comparable.includes("residential hvac") ||
      comparable.includes("commercial hvac") ||
      comparable.includes("new construction hvac") ||
      comparable.includes("heating and cooling") ||
      comparable.includes("home comfort") ||
      comparable === "hvac" ||
      comparable === "hvac service" ||
      comparable === "hvac services"
    ) {
      additions.add("General HVAC");
    }

    if (
      comparable.includes("hvac installation") ||
      comparable.includes("hvac installations") ||
      comparable.includes("hvac install") ||
      comparable.includes("installation and repair") ||
      comparable.includes("installation and repairs") ||
      (mentionsHvac && comparable.includes("installation services"))
    ) {
      additions.add("HVAC installation");
    }

    if (
      comparable.includes("hvac repair") ||
      comparable.includes("hvac repairs") ||
      comparable.includes("installation and repair") ||
      comparable.includes("installation and repairs") ||
      comparable.includes("repairs to address hvac") ||
      comparable.includes("hvac issues")
    ) {
      additions.add("HVAC repair");
    }

    if (
      comparable.includes("hvac maintenance") ||
      comparable.includes("preventative maintenance") ||
      comparable.includes("routine maintenance") ||
      comparable.includes("furnace and air conditioning maintenance") ||
      comparable.includes("heating and cooling maintenance")
    ) {
      additions.add("HVAC maintenance");
    }

    if (
      comparable.includes("indoor air quality") ||
      comparable.includes("air quality") ||
      comparable.includes("iaq")
    ) {
      additions.add("Indoor air quality");
    }

    if (
      comparable.includes("duct cleaning") ||
      comparable.includes("duct sealing") ||
      comparable.includes("ductwork cleaning") ||
      comparable.includes("ductwork sealing") ||
      comparable.includes("ductwork cleaning and care") ||
      comparable.includes("ductwork care") ||
      comparable.includes("duct care") ||
      comparable.includes("air duct")
    ) {
      additions.add("Duct cleaning & sealing");
    }

    if (
      comparable.includes("emergency hvac") ||
      comparable.includes("emergency service") ||
      comparable.includes("emergency services") ||
      comparable.includes("emergency repair") ||
      comparable.includes("emergency repairs") ||
      comparable.includes("emergency response") ||
      comparable.includes("24 7") ||
      comparable.includes("24/7") ||
      comparable.includes("24 hour") ||
      comparable.includes("after hours")
    ) {
      additions.add("Emergency HVAC");
    }

    expanded.push(...additions);
  }

  return expanded;
}

export function dedupeServicesForIndustry(
  services: string[],
  industry: SupportedIndustry
): string[] {
  const expandedServices = expandServicesForIndustry(services, industry);
  const seen = new Set<string>();
  const output: string[] = [];

  for (const service of expandedServices) {
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

const INDUSTRY_SERVICE_SUGGESTIONS: Record<SupportedIndustry, string[]> = {
  PLUMBING: [
    "Drain cleaning",
    "Water heater repair & replacement",
    "Tankless water heater",
    "Leak repair",
    "Slab leak repair",
    "Sewer line service",
    "Gas line service",
    "Emergency plumbing",
  ],
  SEPTIC: [
    "Septic tank pumping",
    "Septic system inspection",
    "Septic system installation",
    "Drain field repair",
    "Lift pump service",
    "Septic repair",
    "Septic maintenance",
    "Emergency septic service",
  ],
  TREE_SERVICE: [
    "Tree removal",
    "Pruning & trimming",
    "Stump grinding",
    "Emergency storm service",
    "Plant health care",
    "Disease & pest management",
    "Lot clearing",
    "Brush removal & debris hauling",
  ],
  HVAC: [
    "AC repair",
    "AC replacement",
    "Furnace repair",
    "Furnace installation",
    "HVAC repair",
    "HVAC installation",
    "HVAC maintenance",
    "Emergency HVAC",
    "No heat / no AC",
    "Seasonal tune-ups",
    "Maintenance plans",
    "Indoor air quality",
    "Duct cleaning & sealing",
    "Heat pump service",
    "Ductless mini-split service",
    "Ductless mini-split installation",
  ],
};

const BROAD_SERVICE_TERMS: Record<SupportedIndustry, string[]> = {
  PLUMBING: ["plumbing", "plumber", "general plumbing"],
  SEPTIC: ["septic", "septic service", "septic services"],
  TREE_SERVICE: ["tree service", "tree services", "tree care"],
  HVAC: [
    "general hvac",
    "hvac",
    "hvac service",
    "hvac services",
    "heating and cooling",
    "heating cooling",
    "residential hvac",
    "commercial hvac",
    "new construction hvac",
    "home comfort",
  ],
};

export function getSuggestedServicesForIndustry(params: {
  industry: SupportedIndustry;
  currentServices: string[];
  max?: number;
}): string[] {
  const current = dedupeServicesForIndustry(
    params.currentServices,
    params.industry
  );

  const currentKeys = new Set(
    current.flatMap((service) => {
      const comparable = normalizeComparable(service);
      const alias = INDUSTRY_ALIAS_MAP[params.industry]?.[comparable];

      return [comparable, normalizeComparable(alias ?? "")].filter(Boolean);
    })
  );

  const suggestions = INDUSTRY_SERVICE_SUGGESTIONS[params.industry].filter(
    (service) => !currentKeys.has(normalizeComparable(service))
  );

  return suggestions.slice(0, params.max ?? 10);
}

export function shouldShowSuggestedServicesForIndustry(params: {
  industry: SupportedIndustry;
  currentServices: string[];
}): boolean {
  const current = dedupeServicesForIndustry(
    params.currentServices,
    params.industry
  );

  if (current.length === 0) return true;

  const broadTerms = BROAD_SERVICE_TERMS[params.industry] ?? [];

  const hasBroadService = current.some((service) => {
    const comparable = normalizeComparable(service);

    return broadTerms.some(
      (term) =>
        comparable === normalizeComparable(term) ||
        comparable.includes(normalizeComparable(term))
    );
  });

  return current.length < 6 || hasBroadService;
}

