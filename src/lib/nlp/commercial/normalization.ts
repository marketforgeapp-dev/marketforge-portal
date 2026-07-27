const COMMON_COMMERCIAL_MISSPELLINGS: Record<string, string> = {
  commerical: "commercial",
  comercial: "commercial",

  propery: "property",
  proprety: "property",

  managment: "management",
  managemnt: "management",
  mangement: "management",

  apartmnt: "apartment",
  appartment: "apartment",
  appartments: "apartments",
  apartmets: "apartments",

  maintainance: "maintenance",
  maintenence: "maintenance",
  maintnance: "maintenance",

  recurrring: "recurring",
  reccurring: "recurring",
  recurrng: "recurring",

  hospitol: "hospital",
  hospitial: "hospital",

  facilty: "facility",
  facilites: "facilities",
  facillity: "facility",

  incumbentt: "incumbent",
  incumbant: "incumbent",

  vendorrr: "vendor",
  vendr: "vendor",

  contractt: "contract",
  contrct: "contract",

  bussiness: "business",
  busines: "business",

  resturant: "restaurant",
  restaraunt: "restaurant",

  goverment: "government",
  governement: "government",

  municipial: "municipal",
  municpal: "municipal",

  maintainence: "maintenance",

  plumbingg: "plumbing",
  pluming: "plumbing",

  heatng: "heating",
  coolng: "cooling",

  preventitive: "preventive",
  preventative: "preventive",
};

function replaceKnownMisspelling(token: string) {
  return COMMON_COMMERCIAL_MISSPELLINGS[token] ?? token;
}

/**
 * Produces a forgiving matching string while preserving the original
 * prompt separately for display and named-account extraction.
 */
export function normalizeCommercialPromptForMatching(
  value: string
) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9&'.\-$\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(replaceKnownMisspelling)
    .join(" ")
    .trim();
}

export function normalizeCommercialFragment(
  value: string
) {
  return normalizeCommercialPromptForMatching(value)
    .replace(/[.'"-]+$/g, "")
    .trim();
}

export function includesCommercialSignal(
  normalizedSource: string,
  signals: string[]
) {
  return signals.some((signal) =>
    normalizedSource.includes(
      normalizeCommercialPromptForMatching(signal)
    )
  );
}