import type { SupportedIndustry } from "@/lib/industry-service-map";

type ExtractedLink = {
  href: string;
  text: string;
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function combinedLinkText(link: ExtractedLink): string {
  return `${link.text} ${link.href}`.toLowerCase();
}

export function inferIndustryFromBusinessContext(input: {
  companyName: string;
  websiteText?: string | null;
  linkTexts?: Array<{ text: string; href: string }>;
}): SupportedIndustry {
  const searchCorpus = [
    input.companyName,
    input.websiteText ?? "",
    ...(input.linkTexts ?? []).map((link) => `${link.text} ${link.href}`),
  ]
    .join(" ")
    .toLowerCase();

  const counts = {
    PLUMBING: 0,
    SEPTIC: 0,
    TREE_SERVICE: 0,
    HVAC: 0,
  };

  const addMatches = (industry: keyof typeof counts, keywords: string[]) => {
    for (const keyword of keywords) {
      if (searchCorpus.includes(keyword)) {
        counts[industry] += 1;
      }
    }
  };

  addMatches("PLUMBING", [
    "plumb",
    "drain",
    "water heater",
    "leak",
    "toilet",
    "sewer",
    "faucet",
    "fixture",
    "hydro jet",
    "sump pump",
    "gas line",
    "repipe",
  ]);

  addMatches("SEPTIC", [
    "septic",
    "drain field",
    "leach field",
    "tank pumping",
    "grease trap",
    "lift pump",
    "riser",
    "lid installation",
  ]);

  addMatches("TREE_SERVICE", [
    "tree",
    "stump",
    "arborist",
    "storm cleanup",
    "pruning",
    "trimming",
    "lot clearing",
    "plant health care",
  ]);

  addMatches("HVAC", [
    "hvac",
    "heating",
    "cooling",
    "air conditioning",
    "furnace",
    "heat pump",
    "ac repair",
  ]);

  const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];

  if (!winner || winner[1] === 0) {
    return "PLUMBING";
  }

  return winner[0] as SupportedIndustry;
}

export function inferServicesFromLinks(params: {
  industry: SupportedIndustry;
  links: ExtractedLink[];
}): string[] {
  const found = new Set<string>();

  const addWhen = (condition: boolean, label: string) => {
    if (condition) found.add(label);
  };

  for (const link of params.links) {
    const combined = combinedLinkText(link);

    if (params.industry === "PLUMBING") {
      addWhen(
        combined.includes("drain") || combined.includes("clog") || combined.includes("rooter"),
        "Drain cleaning"
      );
      addWhen(
        combined.includes("hydro jet") || combined.includes("jetting"),
        "Hydro jetting"
      );
      addWhen(
        combined.includes("water heater") || combined.includes("tankless"),
        "Water heater service"
      );
      addWhen(
        combined.includes("leak") || combined.includes("burst pipe"),
        "Leak repair"
      );
      addWhen(combined.includes("toilet"), "Toilet repair");
      addWhen(
        combined.includes("faucet") || combined.includes("fixture"),
        "Faucets & fixtures"
      );
      addWhen(combined.includes("sump pump"), "Sump pump repair");
      addWhen(
        combined.includes("sewer line") ||
          combined.includes("main line") ||
          combined.includes("trenchless"),
        "Sewer line service"
      );
      addWhen(
        combined.includes("camera inspection") ||
          combined.includes("sewer camera") ||
          combined.includes("drain camera"),
        "Sewer camera inspection"
      );
      addWhen(
        combined.includes("gas line") ||
          combined.includes("gas piping") ||
          combined.includes("gas leak"),
        "Gas line service"
      );
      addWhen(
        combined.includes("repipe") || combined.includes("repiping"),
        "Repiping"
      );
      addWhen(
        combined.includes("emergency") ||
          combined.includes("24 hour") ||
          combined.includes("after hours"),
        "Emergency plumbing"
      );
    }

    if (params.industry === "SEPTIC") {
      addWhen(
        combined.includes("pumping") || combined.includes("septic tank"),
        "Septic tank pumping"
      );
      addWhen(combined.includes("inspection"), "Septic system inspection");
      addWhen(
        combined.includes("installation") || combined.includes("new septic"),
        "Septic system installation"
      );
      addWhen(
        combined.includes("drain field") || combined.includes("leach field"),
        "Drain field repair"
      );
      addWhen(
        combined.includes("sewer line") || combined.includes("main line"),
        "Sewer line repair & replacement"
      );
      addWhen(combined.includes("lift pump"), "Lift pump service");
      addWhen(combined.includes("grease trap"), "Grease trap cleaning");
      addWhen(
        combined.includes("riser") || combined.includes("lid"),
        "Riser & lid installation"
      );
    }

    if (params.industry === "TREE_SERVICE") {
      addWhen(
        combined.includes("tree removal") || combined.includes("hazardous tree"),
        "Tree removal"
      );
      addWhen(
        combined.includes("trimming") ||
          combined.includes("pruning") ||
          combined.includes("canopy"),
        "Pruning & trimming"
      );
      addWhen(combined.includes("stump"), "Stump grinding");
      addWhen(combined.includes("storm"), "Emergency storm service");
      addWhen(
        combined.includes("plant health") ||
          combined.includes("fertilization") ||
          combined.includes("deep root"),
        "Plant health care"
      );
      addWhen(
        combined.includes("disease") || combined.includes("pest"),
        "Disease & pest management"
      );
      addWhen(
        combined.includes("arborist") || combined.includes("risk assessment"),
        "Arborist consultations"
      );
      addWhen(
        combined.includes("lot clearing") || combined.includes("land clearing"),
        "Lot clearing"
      );
    }

    if (params.industry === "HVAC") {
      addWhen(
        combined.includes("ac repair") ||
          combined.includes("air conditioning repair") ||
          combined.includes("cooling repair"),
        "AC repair"
      );
      addWhen(
        combined.includes("heating repair") ||
          combined.includes("furnace repair") ||
          combined.includes("heat pump repair"),
        "Heating repair"
      );
      addWhen(
        combined.includes("maintenance") ||
          combined.includes("tune up") ||
          combined.includes("seasonal maintenance"),
        "HVAC maintenance"
      );
      addWhen(
        combined.includes("replacement") || combined.includes("system replacement"),
        "System replacement"
      );
    }
  }

  return Array.from(found);
}

export function inferGoogleVisibilitySignals(params: {
  servicePageUrls: string[];
  visibleText: string;
  fetchedPagesText: string;
}): {
  hasFaqContent: boolean;
  hasServicePages: boolean;
  hasBlog: boolean;
  hasGoogleBusinessPage: boolean;
} {
  const combinedText = `${params.visibleText} ${params.fetchedPagesText}`.toLowerCase();
  const servicePageCount = params.servicePageUrls.length;

  return {
    hasFaqContent:
      combinedText.includes(" faq ") ||
      combinedText.includes("/faq") ||
      combinedText.includes("frequently asked questions"),
    hasServicePages: servicePageCount > 0,
    hasBlog:
      combinedText.includes("blog") ||
      combinedText.includes("articles") ||
      combinedText.includes("resources"),
    hasGoogleBusinessPage:
      combinedText.includes("google reviews") ||
      combinedText.includes("google business") ||
      combinedText.includes("google maps"),
  };
}