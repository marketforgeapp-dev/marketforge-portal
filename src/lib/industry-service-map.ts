import { CampaignType, OpportunityType } from "@/generated/prisma";
import { ActionFraming } from "@/lib/opportunity-signal-enrichment";

export type SupportedIndustry =
  | "PLUMBING"
  | "SEPTIC"
  | "TREE_SERVICE"
  | "HVAC";

export type ServiceBlueprint = {
  industry: SupportedIndustry;
  familyKey: string;
  serviceName: string;
  title: string;
  defaultOpportunityType: OpportunityType;
  defaultCampaignType: CampaignType;
  defaultBestMove: string;
  defaultActionFraming: ActionFraming;
  demandBias: number;
  valueBias: number;
  everydayBias: number;
  capacityBias: number;
  aeoBias: number;
  nicheLongCycle: boolean;
  backlogEligibleByDefault: boolean;
  aliases: string[];
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeIndustryLabel(value: string | null | undefined): string {
  return normalize(value ?? "").replace(/[^a-z]/g, "");
}

const PLUMBING_BLUEPRINTS: ServiceBlueprint[] = [
  {
    industry: "PLUMBING",
    familyKey: "drain-cleaning",
    serviceName: "Drain cleaning",
    title: "Drain Cleaning Revenue Opportunity",
    defaultOpportunityType: "SEASONAL_DEMAND",
    defaultCampaignType: "DRAIN_SPECIAL",
    defaultBestMove: "Promote Drain Cleaning Service",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 18,
    valueBias: 4,
    everydayBias: 14,
    capacityBias: 8,
    aeoBias: 0,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
    aliases: [
      "drain cleaning",
      "drain clearing",
      "clog removal",
      "rooter service",
      "drain unclogging",
      "clogged drain",
    ],
  },
  {
    industry: "PLUMBING",
    familyKey: "hydro-jetting",
    serviceName: "Hydro jetting",
    title: "Hydro Jetting Revenue Opportunity",
    defaultOpportunityType: "HIGH_VALUE_SERVICE",
    defaultCampaignType: "CUSTOM",
    defaultBestMove: "Promote Hydro Jetting Service",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 8,
    valueBias: 8,
    everydayBias: 4,
    capacityBias: 4,
    aeoBias: 0,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
    aliases: [
      "hydro jetting",
      "hydro-jetting",
      "jetting",
      "drain jetting",
      "sewer jetting",
    ],
  },
  {
    industry: "PLUMBING",
    familyKey: "leak-repair",
    serviceName: "Leak repair",
    title: "Leak Repair Revenue Opportunity",
    defaultOpportunityType: "LOCAL_SEARCH_SPIKE",
    defaultCampaignType: "CUSTOM",
    defaultBestMove: "Promote Leak Repair Service",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 14,
    valueBias: 3,
    everydayBias: 14,
    capacityBias: 6,
    aeoBias: 0,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
    aliases: [
    "leak repair",
    "leak detection",
    "water leak repair",
    "pipe leak",
    ],
  },
  {
  industry: "PLUMBING",
  familyKey: "burst-pipe-repair",
  serviceName: "Burst pipe repair",
  title: "Burst Pipe Repair Revenue Opportunity",
  defaultOpportunityType: "COMPETITOR_INACTIVE",
  defaultCampaignType: "EMERGENCY_SERVICE",
  defaultBestMove: "Promote Burst Pipe Repair Service",
  defaultActionFraming: "PAID_CAMPAIGN",
  demandBias: 16,
  valueBias: 6,
  everydayBias: 10,
  capacityBias: 3,
  aeoBias: 0,
  nicheLongCycle: false,
  backlogEligibleByDefault: true,
  aliases: [
    "burst pipe",
    "burst pipe repair",
    "broken pipe repair",
    "frozen pipe burst",
  ],
},
{
  industry: "PLUMBING",
  familyKey: "slab-leak-repair",
  serviceName: "Slab leak repair",
  title: "Slab Leak Repair Revenue Opportunity",
  defaultOpportunityType: "HIGH_VALUE_SERVICE",
  defaultCampaignType: "CUSTOM",
  defaultBestMove: "Promote Slab Leak Repair Service",
  defaultActionFraming: "PAID_CAMPAIGN",
  demandBias: 10,
  valueBias: 12,
  everydayBias: 4,
  capacityBias: 3,
  aeoBias: 0,
  nicheLongCycle: false,
  backlogEligibleByDefault: true,
  aliases: [
    "slab leak",
    "slab leak repair",
    "under slab leak",
    "foundation leak repair",
  ],
},
  {
    industry: "PLUMBING",
    familyKey: "emergency-plumbing",
    serviceName: "Emergency plumbing",
    title: "Emergency Plumbing Revenue Opportunity",
    defaultOpportunityType: "COMPETITOR_INACTIVE",
    defaultCampaignType: "EMERGENCY_SERVICE",
    defaultBestMove: "Push Emergency Plumbing Response",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 16,
    valueBias: 5,
    everydayBias: 13,
    capacityBias: 2,
    aeoBias: 0,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
    aliases: [
      "emergency plumbing",
      "emergency plumber",
      "24 hour plumber",
      "same day plumbing",
      "after hours plumbing",
      "24 7 emergency service",
      "24/7 emergency service",
      "emergency service",
      "emergency plumbing service",
    ],
  },
  {
  industry: "PLUMBING",
  familyKey: "water-heater-repair-replacement",
  serviceName: "Water heater repair & replacement",
  title: "Water Heater Repair & Replacement Opportunity",
  defaultOpportunityType: "HIGH_VALUE_SERVICE",
  defaultCampaignType: "WATER_HEATER",
  defaultBestMove: "Promote Water Heater Repair & Replacement",
  defaultActionFraming: "PAID_CAMPAIGN",
  demandBias: 12,
  valueBias: 12,
  everydayBias: 8,
  capacityBias: 4,
  aeoBias: 0,
  nicheLongCycle: false,
  backlogEligibleByDefault: true,
  aliases: [
    "water heater repair and replacement",
    "water heater repair",
    "water heater replacement",
    "hot water heater repair",
    "hot water heater replacement",
  ],
},
{
  industry: "PLUMBING",
  familyKey: "water-heater-service",
  serviceName: "Water heater service",
  title: "Water Heater Service Revenue Opportunity",
  defaultOpportunityType: "LOCAL_SEARCH_SPIKE",
  defaultCampaignType: "MAINTENANCE_PUSH",
  defaultBestMove: "Promote Water Heater Service",
  defaultActionFraming: "SCHEDULE_FILL",
  demandBias: 9,
  valueBias: 6,
  everydayBias: 8,
  capacityBias: 10,
  aeoBias: 0,
  nicheLongCycle: false,
  backlogEligibleByDefault: true,
  aliases: [
    "water heater service",
    "water heater maintenance",
    "water heater flush",
    "water heater tune up",
  ],
},
{
  industry: "PLUMBING",
  familyKey: "tankless-water-heater",
  serviceName: "Tankless water heater",
  title: "Tankless Water Heater Revenue Opportunity",
  defaultOpportunityType: "HIGH_VALUE_SERVICE",
  defaultCampaignType: "WATER_HEATER",
  defaultBestMove: "Promote Tankless Water Heater Service",
  defaultActionFraming: "PAID_CAMPAIGN",
  demandBias: 10,
  valueBias: 14,
  everydayBias: 5,
  capacityBias: 4,
  aeoBias: 0,
  nicheLongCycle: false,
  backlogEligibleByDefault: true,
  aliases: [
    "tankless water heater",
    "tankless hot water heater",
    "tankless install",
    "tankless replacement",
    "tankless repair",
  ],
},
  {
    industry: "PLUMBING",
    familyKey: "toilet-repair",
    serviceName: "Toilet repair",
    title: "Toilet Repair Revenue Opportunity",
    defaultOpportunityType: "LOCAL_SEARCH_SPIKE",
    defaultCampaignType: "CUSTOM",
    defaultBestMove: "Promote Toilet Repair Service",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 10,
    valueBias: 1,
    everydayBias: 10,
    capacityBias: 6,
    aeoBias: 0,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
    aliases: [
      "toilet repair",
      "toilet service",
      "toilet replacement",
      "toilet repair and replacement",
      "running toilet",
      "toilet install",
    ],
  },
  {
    industry: "PLUMBING",
    familyKey: "faucets-fixtures",
    serviceName: "Faucets & fixtures",
    title: "Faucets & Fixtures Revenue Opportunity",
    defaultOpportunityType: "LOCAL_SEARCH_SPIKE",
    defaultCampaignType: "CUSTOM",
    defaultBestMove: "Promote Faucet & Fixture Service",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 8,
    valueBias: 3,
    everydayBias: 10,
    capacityBias: 8,
    aeoBias: 0,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
    aliases: [
      "faucets & fixtures",
      "faucets and fixtures",
      "faucet repair",
      "fixture repair",
      "faucet install",
      "sink faucet",
      "plumbing fixture",
      "faucet fixture",
      "faucet fixtures",
      "faucets fixtures",
    ],
  },
  {
  industry: "PLUMBING",
  familyKey: "garbage-disposal",
  serviceName: "Garbage disposal repair & installation",
  title: "Garbage Disposal Revenue Opportunity",
  defaultOpportunityType: "LOCAL_SEARCH_SPIKE",
  defaultCampaignType: "CUSTOM",
  defaultBestMove: "Promote Garbage Disposal Service",
  defaultActionFraming: "PAID_CAMPAIGN",
  demandBias: 9,
  valueBias: 3,
  everydayBias: 9,
  capacityBias: 7,
  aeoBias: 0,
  nicheLongCycle: false,
  backlogEligibleByDefault: true,
  aliases: [
    "garbage disposal",
    "garbage disposal repair",
    "garbage disposal installation",
    "garbage disposal repair and installation",
    "disposal repair",
    "disposal installation",
  ],
},
  {
    industry: "PLUMBING",
    familyKey: "sump-pump",
    serviceName: "Sump pump repair",
    title: "Sump Pump Revenue Opportunity",
    defaultOpportunityType: "SEASONAL_DEMAND",
    defaultCampaignType: "CUSTOM",
    defaultBestMove: "Promote Sump Pump Repair Service",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 9,
    valueBias: 2,
    everydayBias: 8,
    capacityBias: 5,
    aeoBias: 0,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
    aliases: [
      "sump pump",
      "sump pump repair",
      "sump pump replacement",
      "basement pump",
    ],
  },
  {
    industry: "PLUMBING",
    familyKey: "sewer-line",
    serviceName: "Sewer line service",
    title: "Sewer Line Revenue Opportunity",
    defaultOpportunityType: "HIGH_VALUE_SERVICE",
    defaultCampaignType: "CUSTOM",
    defaultBestMove: "Promote Sewer Line Service",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 9,
    valueBias: 14,
    everydayBias: 2,
    capacityBias: 3,
    aeoBias: 0,
    nicheLongCycle: true,
    backlogEligibleByDefault: false,
    aliases: [
      "sewer line",
      "sewer line repair",
      "sewer line replacement",
      "sewer repair",
      "main line repair",
      "main line replacement",
      "trenchless sewer",
    ],
  },
  {
    industry: "PLUMBING",
    familyKey: "sewer-camera",
    serviceName: "Sewer camera inspection",
    title: "Sewer Camera Revenue Opportunity",
    defaultOpportunityType: "LOCAL_SEARCH_SPIKE",
    defaultCampaignType: "CUSTOM",
    defaultBestMove: "Promote Sewer Camera Inspection",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 7,
    valueBias: 5,
    everydayBias: 6,
    capacityBias: 6,
    aeoBias: 0,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
    aliases: [
      "sewer camera",
      "camera inspection",
      "sewer camera inspection",
      "drain camera inspection",
      "pipe camera",
      "line inspection",
    ],
  },
  {
    industry: "PLUMBING",
    familyKey: "gas-line",
    serviceName: "Gas line service",
    title: "Gas Line Revenue Opportunity",
    defaultOpportunityType: "HIGH_VALUE_SERVICE",
    defaultCampaignType: "CUSTOM",
    defaultBestMove: "Promote Gas Line Service",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 6,
    valueBias: 10,
    everydayBias: 2,
    capacityBias: 4,
    aeoBias: 0,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
    aliases: [
      "gas line",
      "gas line repair",
      "gas line replacement",
      "gas piping",
      "gas leak repair",
    ],
  },
  {
  industry: "PLUMBING",
  familyKey: "water-softener",
  serviceName: "Water softener installation",
  title: "Water Softener Installation Opportunity",
  defaultOpportunityType: "HIGH_VALUE_SERVICE",
  defaultCampaignType: "CUSTOM",
  defaultBestMove: "Promote Water Softener Installation",
  defaultActionFraming: "PAID_CAMPAIGN",
  demandBias: 7,
  valueBias: 10,
  everydayBias: 4,
  capacityBias: 5,
  aeoBias: 0,
  nicheLongCycle: false,
  backlogEligibleByDefault: true,
  aliases: [
    "water softener",
    "water softener installation",
    "water softener install",
    "softener installation",
  ],
},
{
  industry: "PLUMBING",
  familyKey: "custom-home-plumbing-installation",
  serviceName: "Custom home plumbing installation",
  title: "Custom Home Plumbing Installation Opportunity",
  defaultOpportunityType: "HIGH_VALUE_SERVICE",
  defaultCampaignType: "CUSTOM",
  defaultBestMove: "Promote Custom Home Plumbing Installation",
  defaultActionFraming: "PAID_CAMPAIGN",
  demandBias: 4,
  valueBias: 16,
  everydayBias: 1,
  capacityBias: 2,
  aeoBias: 0,
  nicheLongCycle: true,
  backlogEligibleByDefault: false,
  aliases: [
    "custom home plumbing installation",
    "custom home plumbing",
    "new construction plumbing",
    "new build plumbing",
    "rough in plumbing",
  ],
},
  {
    industry: "PLUMBING",
    familyKey: "repiping",
    serviceName: "Repiping",
    title: "Repiping Revenue Opportunity",
    defaultOpportunityType: "HIGH_VALUE_SERVICE",
    defaultCampaignType: "CUSTOM",
    defaultBestMove: "Promote Repiping Service",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 4,
    valueBias: 16,
    everydayBias: 0,
    capacityBias: 2,
    aeoBias: 0,
    nicheLongCycle: true,
    backlogEligibleByDefault: false,
    aliases: [
      "repipe",
      "repipes",
      "repiping",
      "whole home repipe",
      "house repipe",
      "pipe replacement",
      "water line replacement",
    ],
  },
  {
    industry: "PLUMBING",
    familyKey: "maintenance",
    serviceName: "Service checkup",
    title: "Open Capacity Revenue Opportunity",
    defaultOpportunityType: "CAPACITY_GAP",
    defaultCampaignType: "MAINTENANCE_PUSH",
    defaultBestMove: "Fill Schedule with Service Checkups",
    defaultActionFraming: "SCHEDULE_FILL",
    demandBias: 8,
    valueBias: 2,
    everydayBias: 10,
    capacityBias: 18,
    aeoBias: 0,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
    aliases: [
      "service checkup",
      "maintenance",
      "plumbing maintenance",
      "plumbing inspection",
      "checkup",
      "tune up",
    ],
  },
  {
    industry: "PLUMBING",
    familyKey: "general-plumbing",
    serviceName: "General plumbing",
    title: "General Plumbing Revenue Opportunity",
    defaultOpportunityType: "LOCAL_SEARCH_SPIKE",
    defaultCampaignType: "CUSTOM",
    defaultBestMove: "Promote Core Plumbing Services",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 10,
    valueBias: 2,
    everydayBias: 10,
    capacityBias: 8,
    aeoBias: 0,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
    aliases: [
      "general plumbing",
      "plumbing service",
      "plumber",
      "residential plumbing",
      "commercial plumbing",
      "plumbing repairs",
    ],
  },
  {
    industry: "PLUMBING",
    familyKey: "ai-search-visibility",
    serviceName: "AI search visibility",
    title: "AI Search Visibility Opportunity",
    defaultOpportunityType: "AI_SEARCH_VISIBILITY",
    defaultCampaignType: "AEO_FAQ",
    defaultBestMove: "Improve AI Search Visibility",
    defaultActionFraming: "AEO_CONTENT",
    demandBias: 4,
    valueBias: 1,
    everydayBias: 2,
    capacityBias: 4,
    aeoBias: 20,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
    aliases: [
      "ai search visibility",
      "answer engine optimization",
      "aeo",
      "faq",
      "ai answers",
    ],
  },
];

const SEPTIC_BLUEPRINTS: ServiceBlueprint[] = [
  {
    industry: "SEPTIC",
    familyKey: "septic-tank-pumping",
    serviceName: "Septic tank pumping",
    title: "Septic Tank Pumping Revenue Opportunity",
    defaultOpportunityType: "SEASONAL_DEMAND",
    defaultCampaignType: "CUSTOM",
    defaultBestMove: "Promote Septic Tank Pumping Service",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 15,
    valueBias: 4,
    everydayBias: 12,
    capacityBias: 8,
    aeoBias: 0,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
    aliases: [
      "septic tank pumping",
      "septic pumping",
      "tank pumping",
      "septic cleaning",
    ],
  },
  {
    industry: "SEPTIC",
    familyKey: "system-inspection",
    serviceName: "Septic system inspection",
    title: "Septic Inspection Revenue Opportunity",
    defaultOpportunityType: "LOCAL_SEARCH_SPIKE",
    defaultCampaignType: "CUSTOM",
    defaultBestMove: "Promote Septic Inspection Service",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 10,
    valueBias: 5,
    everydayBias: 8,
    capacityBias: 10,
    aeoBias: 0,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
    aliases: [
      "septic inspection",
      "system inspection",
      "point of sale inspection",
      "sludge level inspection",
    ],
  },
  {
    industry: "SEPTIC",
    familyKey: "septic-installation",
    serviceName: "Septic system installation",
    title: "Septic Installation Revenue Opportunity",
    defaultOpportunityType: "HIGH_VALUE_SERVICE",
    defaultCampaignType: "CUSTOM",
    defaultBestMove: "Promote Septic Installation Service",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 5,
    valueBias: 17,
    everydayBias: 0,
    capacityBias: 2,
    aeoBias: 0,
    nicheLongCycle: true,
    backlogEligibleByDefault: false,
    aliases: [
      "septic installation",
      "septic system installation",
      "new septic system",
      "leach field installation",
    ],
  },
  {
    industry: "SEPTIC",
    familyKey: "drain-field-repair",
    serviceName: "Drain field repair",
    title: "Drain Field Repair Opportunity",
    defaultOpportunityType: "HIGH_VALUE_SERVICE",
    defaultCampaignType: "CUSTOM",
    defaultBestMove: "Promote Drain Field Repair Service",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 8,
    valueBias: 14,
    everydayBias: 0,
    capacityBias: 4,
    aeoBias: 0,
    nicheLongCycle: true,
    backlogEligibleByDefault: false,
    aliases: [
      "drain field repair",
      "leach field repair",
      "drain field replacement",
    ],
  },
  {
    industry: "SEPTIC",
    familyKey: "sewer-line-septic",
    serviceName: "Sewer line repair & replacement",
    title: "Sewer Line Revenue Opportunity",
    defaultOpportunityType: "HIGH_VALUE_SERVICE",
    defaultCampaignType: "CUSTOM",
    defaultBestMove: "Promote Sewer Line Repair & Replacement",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 9,
    valueBias: 15,
    everydayBias: 2,
    capacityBias: 3,
    aeoBias: 0,
    nicheLongCycle: true,
    backlogEligibleByDefault: false,
    aliases: [
      "sewer line repair",
      "sewer line replacement",
      "main line repair",
      "main line replacement",
    ],
  },
  {
    industry: "SEPTIC",
    familyKey: "lift-pump-service",
    serviceName: "Lift pump service",
    title: "Lift Pump Revenue Opportunity",
    defaultOpportunityType: "LOCAL_SEARCH_SPIKE",
    defaultCampaignType: "CUSTOM",
    defaultBestMove: "Promote Lift Pump Service",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 9,
    valueBias: 7,
    everydayBias: 5,
    capacityBias: 5,
    aeoBias: 0,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
    aliases: [
      "lift pump service",
      "lift pump repair",
      "effluent pump repair",
      "lift station pump",
    ],
  },
  {
    industry: "SEPTIC",
    familyKey: "grease-trap-cleaning",
    serviceName: "Grease trap cleaning",
    title: "Grease Trap Revenue Opportunity",
    defaultOpportunityType: "SEASONAL_DEMAND",
    defaultCampaignType: "CUSTOM",
    defaultBestMove: "Promote Grease Trap Cleaning",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 10,
    valueBias: 5,
    everydayBias: 10,
    capacityBias: 8,
    aeoBias: 0,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
    aliases: [
      "grease trap cleaning",
      "grease trap service",
      "restaurant grease trap",
    ],
  },
  {
    industry: "SEPTIC",
    familyKey: "riser-lid-installation",
    serviceName: "Riser & lid installation",
    title: "Riser & Lid Installation Opportunity",
    defaultOpportunityType: "LOCAL_SEARCH_SPIKE",
    defaultCampaignType: "CUSTOM",
    defaultBestMove: "Promote Riser & Lid Installation",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 7,
    valueBias: 6,
    everydayBias: 6,
    capacityBias: 7,
    aeoBias: 0,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
    aliases: ["riser installation", "lid installation", "riser and lid", "tank riser"],
  },
    {
    industry: "SEPTIC",
    familyKey: "septic-repair",
    serviceName: "Septic repair",
    title: "Septic Repair Revenue Opportunity",
    defaultOpportunityType: "HIGH_VALUE_SERVICE",
    defaultCampaignType: "CUSTOM",
    defaultBestMove: "Promote Septic Repair Service",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 10,
    valueBias: 12,
    everydayBias: 5,
    capacityBias: 5,
    aeoBias: 0,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
    aliases: [
      "septic repair",
      "septic tank repair",
      "septic system repair",
      "baffle repair",
      "tank repair",
    ],
  },
  {
    industry: "SEPTIC",
    familyKey: "septic-maintenance",
    serviceName: "Septic maintenance",
    title: "Septic Maintenance Revenue Opportunity",
    defaultOpportunityType: "CAPACITY_GAP",
    defaultCampaignType: "MAINTENANCE_PUSH",
    defaultBestMove: "Fill Schedule with Septic Maintenance",
    defaultActionFraming: "SCHEDULE_FILL",
    demandBias: 8,
    valueBias: 4,
    everydayBias: 9,
    capacityBias: 15,
    aeoBias: 0,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
    aliases: [
      "septic maintenance",
      "system maintenance",
      "annual septic maintenance",
      "septic tune up",
      "maintenance plan",
    ],
  },
  {
    industry: "SEPTIC",
    familyKey: "emergency-septic",
    serviceName: "Emergency septic service",
    title: "Emergency Septic Revenue Opportunity",
    defaultOpportunityType: "COMPETITOR_INACTIVE",
    defaultCampaignType: "EMERGENCY_SERVICE",
    defaultBestMove: "Promote Emergency Septic Service",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 15,
    valueBias: 8,
    everydayBias: 3,
    capacityBias: 3,
    aeoBias: 0,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
    aliases: [
      "emergency septic",
      "emergency septic service",
      "septic backup",
      "septic overflow",
      "sewage backup",
      "24 7 emergency service",
      "24/7 emergency service",
      "emergency service",
    ],
  },
  {
    industry: "SEPTIC",
    familyKey: "ai-search-visibility",
    serviceName: "AI search visibility",
    title: "AI Search Visibility Opportunity",
    defaultOpportunityType: "AI_SEARCH_VISIBILITY",
    defaultCampaignType: "AEO_FAQ",
    defaultBestMove: "Improve AI Search Visibility",
    defaultActionFraming: "AEO_CONTENT",
    demandBias: 4,
    valueBias: 1,
    everydayBias: 2,
    capacityBias: 4,
    aeoBias: 20,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
    aliases: [
      "ai search visibility",
      "answer engine optimization",
      "aeo",
      "faq",
      "ai answers",
    ],
  },
];

const TREE_SERVICE_BLUEPRINTS: ServiceBlueprint[] = [
  {
    industry: "TREE_SERVICE",
    familyKey: "tree-removal",
    serviceName: "Tree removal",
    title: "Tree Removal Revenue Opportunity",
    defaultOpportunityType: "HIGH_VALUE_SERVICE",
    defaultCampaignType: "CUSTOM",
    defaultBestMove: "Promote Tree Removal Service",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 12,
    valueBias: 14,
    everydayBias: 4,
    capacityBias: 4,
    aeoBias: 0,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
    aliases: ["tree removal", "hazardous tree removal", "remove tree"],
  },
  {
    industry: "TREE_SERVICE",
    familyKey: "tree-trimming",
    serviceName: "Pruning & trimming",
    title: "Tree Trimming Revenue Opportunity",
    defaultOpportunityType: "SEASONAL_DEMAND",
    defaultCampaignType: "CUSTOM",
    defaultBestMove: "Promote Tree Trimming Service",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 13,
    valueBias: 5,
    everydayBias: 11,
    capacityBias: 8,
    aeoBias: 0,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
    aliases: [
      "tree trimming",
      "tree pruning",
      "canopy lifting",
      "tree pruning service",
    ],
  },
  {
    industry: "TREE_SERVICE",
    familyKey: "stump-grinding",
    serviceName: "Stump grinding",
    title: "Stump Grinding Revenue Opportunity",
    defaultOpportunityType: "LOCAL_SEARCH_SPIKE",
    defaultCampaignType: "CUSTOM",
    defaultBestMove: "Promote Stump Grinding Service",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 10,
    valueBias: 6,
    everydayBias: 8,
    capacityBias: 7,
    aeoBias: 0,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
    aliases: ["stump grinding", "stump removal", "grind stump"],
  },
  {
    industry: "TREE_SERVICE",
    familyKey: "storm-cleanup",
    serviceName: "Emergency storm service",
    title: "Storm Cleanup Revenue Opportunity",
    defaultOpportunityType: "COMPETITOR_INACTIVE",
    defaultCampaignType: "EMERGENCY_SERVICE",
    defaultBestMove: "Promote Emergency Storm Cleanup",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 16,
    valueBias: 8,
    everydayBias: 0,
    capacityBias: 2,
    aeoBias: 0,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
    aliases: [
      "storm cleanup",
      "emergency storm service",
      "fallen tree removal",
      "storm damage tree service",
      "24 7 emergency service",
      "24/7 emergency service",
      "emergency service",
      "emergency tree service",
      "storm service",
    ],
  },
  {
    industry: "TREE_SERVICE",
    familyKey: "plant-health-care",
    serviceName: "Plant health care",
    title: "Plant Health Care Revenue Opportunity",
    defaultOpportunityType: "SEASONAL_DEMAND",
    defaultCampaignType: "CUSTOM",
    defaultBestMove: "Promote Plant Health Care Service",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 8,
    valueBias: 5,
    everydayBias: 7,
    capacityBias: 9,
    aeoBias: 0,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
    aliases: ["plant health care", "deep root feeding", "fertilization", "soil aeration"],
  },
  {
    industry: "TREE_SERVICE",
    familyKey: "disease-pest-management",
    serviceName: "Disease & pest management",
    title: "Tree Health Revenue Opportunity",
    defaultOpportunityType: "LOCAL_SEARCH_SPIKE",
    defaultCampaignType: "CUSTOM",
    defaultBestMove: "Promote Tree Disease & Pest Management",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 9,
    valueBias: 6,
    everydayBias: 6,
    capacityBias: 7,
    aeoBias: 0,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
    aliases: [
      "tree disease treatment",
      "pest management",
      "emerald ash borer treatment",
      "tree health treatment",
    ],
  },
  {
    industry: "TREE_SERVICE",
    familyKey: "arborist-consultation",
    serviceName: "Arborist consultations",
    title: "Arborist Consultation Opportunity",
    defaultOpportunityType: "HIGH_VALUE_SERVICE",
    defaultCampaignType: "CUSTOM",
    defaultBestMove: "Promote Arborist Consultation Services",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 6,
    valueBias: 10,
    everydayBias: 3,
    capacityBias: 5,
    aeoBias: 0,
    nicheLongCycle: true,
    backlogEligibleByDefault: false,
    aliases: [
      "arborist consultation",
      "tree risk assessment",
      "arborist report",
      "tree preservation consultation",
    ],
  },
  {
    industry: "TREE_SERVICE",
    familyKey: "lot-clearing",
    serviceName: "Lot clearing",
    title: "Lot Clearing Revenue Opportunity",
    defaultOpportunityType: "HIGH_VALUE_SERVICE",
    defaultCampaignType: "CUSTOM",
    defaultBestMove: "Promote Lot Clearing Service",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 7,
    valueBias: 15,
    everydayBias: 0,
    capacityBias: 3,
    aeoBias: 0,
    nicheLongCycle: true,
    backlogEligibleByDefault: false,
    aliases: ["lot clearing", "land clearing", "site clearing", "vegetation clearing"],
  },
    {
    industry: "TREE_SERVICE",
    familyKey: "tree-planting",
    serviceName: "Tree planting & transplanting",
    title: "Tree Planting Revenue Opportunity",
    defaultOpportunityType: "HIGH_VALUE_SERVICE",
    defaultCampaignType: "CUSTOM",
    defaultBestMove: "Promote Tree Planting & Transplanting",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 7,
    valueBias: 8,
    everydayBias: 4,
    capacityBias: 6,
    aeoBias: 0,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
    aliases: [
      "tree planting",
      "tree transplanting",
      "tree installation",
      "plant a tree",
      "transplant tree",
    ],
  },
  {
    industry: "TREE_SERVICE",
    familyKey: "tree-cabling",
    serviceName: "Tree cabling & bracing",
    title: "Tree Cabling Revenue Opportunity",
    defaultOpportunityType: "HIGH_VALUE_SERVICE",
    defaultCampaignType: "CUSTOM",
    defaultBestMove: "Promote Tree Cabling & Bracing",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 6,
    valueBias: 11,
    everydayBias: 2,
    capacityBias: 5,
    aeoBias: 0,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
    aliases: [
      "tree cabling",
      "tree bracing",
      "tree support system",
      "tree support systems",
      "structural support",
    ],
  },
  {
    industry: "TREE_SERVICE",
    familyKey: "brush-removal",
    serviceName: "Brush removal & debris hauling",
    title: "Brush Removal Revenue Opportunity",
    defaultOpportunityType: "CAPACITY_GAP",
    defaultCampaignType: "MAINTENANCE_PUSH",
    defaultBestMove: "Fill Schedule with Brush Removal Jobs",
    defaultActionFraming: "SCHEDULE_FILL",
    demandBias: 8,
    valueBias: 3,
    everydayBias: 8,
    capacityBias: 12,
    aeoBias: 0,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
    aliases: [
      "brush removal",
      "debris hauling",
      "yard debris removal",
      "brush hauling",
      "tree debris cleanup",
    ],
  },
  {
    industry: "TREE_SERVICE",
    familyKey: "ai-search-visibility",
    serviceName: "AI search visibility",
    title: "AI Search Visibility Opportunity",
    defaultOpportunityType: "AI_SEARCH_VISIBILITY",
    defaultCampaignType: "AEO_FAQ",
    defaultBestMove: "Improve AI Search Visibility",
    defaultActionFraming: "AEO_CONTENT",
    demandBias: 4,
    valueBias: 1,
    everydayBias: 2,
    capacityBias: 4,
    aeoBias: 20,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
    aliases: [
      "ai search visibility",
      "answer engine optimization",
      "aeo",
      "faq",
      "ai answers",
    ],
  },
];

const HVAC_BLUEPRINTS: ServiceBlueprint[] = [
  {
    industry: "HVAC",
    familyKey: "general-hvac",
    serviceName: "General HVAC",
    title: "General HVAC Revenue Opportunity",
    defaultOpportunityType: "CAPACITY_GAP",
    defaultCampaignType: "CUSTOM",
    defaultBestMove: "Promote General HVAC Services",
    defaultActionFraming: "MIXED",
    demandBias: 4,
    valueBias: 3,
    everydayBias: 5,
    capacityBias: 4,
    aeoBias: 0,
    nicheLongCycle: false,
    backlogEligibleByDefault: false,
    aliases: [
      "general hvac",
      "hvac services",
      "hvac service",
      "heating and cooling",
      "residential hvac",
      "commercial hvac",
      "new construction hvac",
      "home comfort solutions",
      "home comfort",
    ],
  },
  {
    industry: "HVAC",
    familyKey: "ac-repair",
    serviceName: "AC repair",
    title: "AC Repair Revenue Opportunity",
    defaultOpportunityType: "SEASONAL_DEMAND",
    defaultCampaignType: "CUSTOM",
    defaultBestMove: "Promote AC Repair Service",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 16,
    valueBias: 6,
    everydayBias: 10,
    capacityBias: 5,
    aeoBias: 0,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
    aliases: ["ac repair", "air conditioning repair", "cooling repair"],
  },
  {
    industry: "HVAC",
    familyKey: "ac-replacement",
    serviceName: "AC replacement",
    title: "AC Replacement Revenue Opportunity",
    defaultOpportunityType: "HIGH_VALUE_SERVICE",
    defaultCampaignType: "CUSTOM",
    defaultBestMove: "Promote AC Replacement",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 10,
    valueBias: 16,
    everydayBias: 3,
    capacityBias: 3,
    aeoBias: 0,
    nicheLongCycle: true,
    backlogEligibleByDefault: true,
    aliases: [
      "ac replacement",
      "air conditioner replacement",
      "air conditioning replacement",
      "ac install",
      "ac installation",
    ],
  },
  {
    industry: "HVAC",
    familyKey: "furnace-repair",
    serviceName: "Furnace repair",
    title: "Furnace Repair Revenue Opportunity",
    defaultOpportunityType: "SEASONAL_DEMAND",
    defaultCampaignType: "CUSTOM",
    defaultBestMove: "Promote Furnace Repair Service",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 15,
    valueBias: 6,
    everydayBias: 9,
    capacityBias: 5,
    aeoBias: 0,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
    aliases: [
      "furnace repair",
      "heating repair",
      "heater repair",
      "heat repair",
    ],
  },
  {
    industry: "HVAC",
    familyKey: "furnace-installation",
    serviceName: "Furnace installation",
    title: "Furnace Installation Revenue Opportunity",
    defaultOpportunityType: "HIGH_VALUE_SERVICE",
    defaultCampaignType: "CUSTOM",
    defaultBestMove: "Promote Furnace Installation",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 9,
    valueBias: 15,
    everydayBias: 2,
    capacityBias: 3,
    aeoBias: 0,
    nicheLongCycle: true,
    backlogEligibleByDefault: true,
    aliases: [
      "furnace installation",
      "furnace install",
      "furnace replacement",
      "heater installation",
      "heater replacement",
    ],
  },
  {
    industry: "HVAC",
    familyKey: "hvac-repair",
    serviceName: "HVAC repair",
    title: "HVAC Repair Revenue Opportunity",
    defaultOpportunityType: "LOCAL_SEARCH_SPIKE",
    defaultCampaignType: "CUSTOM",
    defaultBestMove: "Promote HVAC Repair Service",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 12,
    valueBias: 6,
    everydayBias: 9,
    capacityBias: 5,
    aeoBias: 0,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
    aliases: [
      "hvac repair",
      "hvac repairs",
      "hvac service repair",
      "hvac service repairs",
      "repair hvac",
    ],
  },
  {
    industry: "HVAC",
    familyKey: "hvac-installation",
    serviceName: "HVAC installation",
    title: "HVAC Installation Revenue Opportunity",
    defaultOpportunityType: "HIGH_VALUE_SERVICE",
    defaultCampaignType: "CUSTOM",
    defaultBestMove: "Promote HVAC Installation",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 8,
    valueBias: 12,
    everydayBias: 4,
    capacityBias: 4,
    aeoBias: 2,
    nicheLongCycle: true,
    backlogEligibleByDefault: true,
    aliases: [
      "hvac installation",
      "hvac installations",
      "hvac install",
      "hvac installs",
      "hvac installation service",
      "hvac installation services",
    ],
  },
  {
    industry: "HVAC",
    familyKey: "hvac-maintenance",
    serviceName: "HVAC maintenance",
    title: "HVAC Maintenance Revenue Opportunity",
    defaultOpportunityType: "CAPACITY_GAP",
    defaultCampaignType: "MAINTENANCE_PUSH",
    defaultBestMove: "Promote HVAC Maintenance",
    defaultActionFraming: "SCHEDULE_FILL",
    demandBias: 9,
    valueBias: 4,
    everydayBias: 10,
    capacityBias: 13,
    aeoBias: 0,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
    aliases: [
      "hvac maintenance",
      "hvac maintenance service",
      "hvac maintenance services",
      "furnace and air conditioning maintenance",
      "heating and cooling maintenance",
      "preventative maintenance",
      "preventive maintenance",
      "routine maintenance",
    ],
  },
  {
    industry: "HVAC",
    familyKey: "emergency-hvac",
    serviceName: "Emergency HVAC",
    title: "Emergency HVAC Revenue Opportunity",
    defaultOpportunityType: "COMPETITOR_INACTIVE",
    defaultCampaignType: "EMERGENCY_SERVICE",
    defaultBestMove: "Promote Emergency HVAC Response",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 18,
    valueBias: 8,
    everydayBias: 11,
    capacityBias: 2,
    aeoBias: 0,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
    aliases: [
      "emergency hvac",
      "emergency hvac service",
      "emergency hvac services",
      "emergency heating and cooling",
      "emergency repair",
      "emergency repairs",
      "24 hour hvac",
      "24/7 hvac",
      "24 7 hvac",
      "after hours hvac",
      "emergency service",
    ],
  },
  {
    industry: "HVAC",
    familyKey: "no-heat-no-ac",
    serviceName: "No heat / no AC",
    title: "No Heat / No AC Revenue Opportunity",
    defaultOpportunityType: "LOCAL_SEARCH_SPIKE",
    defaultCampaignType: "EMERGENCY_SERVICE",
    defaultBestMove: "Capture No Heat / No AC Demand",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 18,
    valueBias: 7,
    everydayBias: 10,
    capacityBias: 3,
    aeoBias: 0,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
    aliases: [
      "no heat",
      "no ac",
      "no cooling",
      "ac not working",
      "heat not working",
      "furnace not working",
    ],
  },
  {
    industry: "HVAC",
    familyKey: "seasonal-tune-ups",
    serviceName: "Seasonal tune-ups",
    title: "Seasonal HVAC Tune-Up Opportunity",
    defaultOpportunityType: "CAPACITY_GAP",
    defaultCampaignType: "MAINTENANCE_PUSH",
    defaultBestMove: "Fill Schedule with Seasonal Tune-Ups",
    defaultActionFraming: "SCHEDULE_FILL",
    demandBias: 12,
    valueBias: 3,
    everydayBias: 12,
    capacityBias: 16,
    aeoBias: 0,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
    aliases: [
      "seasonal tune up",
      "seasonal tune ups",
      "ac tune up",
      "furnace tune up",
      "hvac tune up",
      "system tune up",
    ],
  },
  {
    industry: "HVAC",
    familyKey: "maintenance-plans",
    serviceName: "Maintenance plans",
    title: "HVAC Maintenance Plan Opportunity",
    defaultOpportunityType: "CAPACITY_GAP",
    defaultCampaignType: "MAINTENANCE_PUSH",
    defaultBestMove: "Promote HVAC Maintenance Plans",
    defaultActionFraming: "SCHEDULE_FILL",
    demandBias: 8,
    valueBias: 7,
    everydayBias: 10,
    capacityBias: 14,
    aeoBias: 0,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
    aliases: [
      "maintenance plan",
      "maintenance plans",
      "maintenance agreement",
      "maintenance agreements",
      "service agreement",
      "service agreements",
      "hvac maintenance plan",
      "hvac service plan",
    ],
  },
  {
    industry: "HVAC",
    familyKey: "indoor-air-quality",
    serviceName: "Indoor air quality",
    title: "Indoor Air Quality Revenue Opportunity",
    defaultOpportunityType: "HIGH_VALUE_SERVICE",
    defaultCampaignType: "CUSTOM",
    defaultBestMove: "Promote Indoor Air Quality Solutions",
    defaultActionFraming: "MIXED",
    demandBias: 7,
    valueBias: 9,
    everydayBias: 5,
    capacityBias: 6,
    aeoBias: 6,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
    aliases: [
      "indoor air quality",
      "indoor air quality improvement",
      "indoor air quality improvements",
      "indoor air quality solution",
      "indoor air quality solutions",
      "air quality",
      "air quality improvement",
      "air quality improvements",
      "air quality service",
      "air quality services",
      "iaq",
      "iaq service",
      "iaq services",
      "air purifier",
      "air purification",
      "whole home air purifier",
      "humidity control",
      "dehumidifier",
    ],
  },
  {
    industry: "HVAC",
    familyKey: "duct-cleaning-sealing",
    serviceName: "Duct cleaning & sealing",
    title: "Duct Cleaning & Sealing Opportunity",
    defaultOpportunityType: "HIGH_VALUE_SERVICE",
    defaultCampaignType: "CUSTOM",
    defaultBestMove: "Promote Duct Cleaning & Sealing",
    defaultActionFraming: "MIXED",
    demandBias: 7,
    valueBias: 7,
    everydayBias: 6,
    capacityBias: 8,
    aeoBias: 5,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
    aliases: [
      "duct cleaning",
      "duct sealing",
      "duct cleaning and sealing",
      "ductwork cleaning",
      "ductwork sealing",
      "ductwork cleaning and care",
      "duct cleaning and care",
      "air duct cleaning",
      "duct care",
    ],
  },
  {
    industry: "HVAC",
    familyKey: "heat-pump-service",
    serviceName: "Heat pump service",
    title: "Heat Pump Service Opportunity",
    defaultOpportunityType: "HIGH_VALUE_SERVICE",
    defaultCampaignType: "CUSTOM",
    defaultBestMove: "Promote Heat Pump Service",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 10,
    valueBias: 10,
    everydayBias: 6,
    capacityBias: 5,
    aeoBias: 2,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
    aliases: [
      "heat pump",
      "heat pump repair",
      "heat pump installation",
      "heat pump replacement",
      "heat pump service",
    ],
  },
  {
    industry: "HVAC",
    familyKey: "ductless-mini-split-service",
    serviceName: "Ductless mini-split service",
    title: "Ductless Mini-Split Service Opportunity",
    defaultOpportunityType: "HIGH_VALUE_SERVICE",
    defaultCampaignType: "CUSTOM",
    defaultBestMove: "Promote Ductless Mini-Split Service",
    defaultActionFraming: "MIXED",
    demandBias: 8,
    valueBias: 9,
    everydayBias: 5,
    capacityBias: 5,
    aeoBias: 3,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
    aliases: [
      "ductless mini split service",
      "ductless mini split repair",
      "mini split service",
      "mini split repair",
    ],
  },
  {
    industry: "HVAC",
    familyKey: "ductless-mini-split-installation",
    serviceName: "Ductless mini-split installation",
    title: "Ductless Mini-Split Installation Opportunity",
    defaultOpportunityType: "HIGH_VALUE_SERVICE",
    defaultCampaignType: "CUSTOM",
    defaultBestMove: "Promote Ductless Mini-Split Installation",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 8,
    valueBias: 13,
    everydayBias: 4,
    capacityBias: 4,
    aeoBias: 3,
    nicheLongCycle: true,
    backlogEligibleByDefault: true,
    aliases: [
      "ductless mini split installation",
      "ductless mini split install",
      "mini split installation",
      "mini split install",
    ],
  },
  {
    industry: "HVAC",
    familyKey: "ai-search-visibility",
    serviceName: "AI search visibility",
    title: "AI Search Visibility Opportunity",
    defaultOpportunityType: "AI_SEARCH_VISIBILITY",
    defaultCampaignType: "AEO_FAQ",
    defaultBestMove: "Improve AI Search Visibility",
    defaultActionFraming: "AEO_CONTENT",
    demandBias: 4,
    valueBias: 1,
    everydayBias: 2,
    capacityBias: 4,
    aeoBias: 20,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
    aliases: [
      "ai search visibility",
      "answer engine optimization",
      "aeo",
      "faq",
      "ai answers",
    ],
  },
];

const INDUSTRY_BLUEPRINTS: Record<SupportedIndustry, ServiceBlueprint[]> = {
  PLUMBING: PLUMBING_BLUEPRINTS,
  SEPTIC: SEPTIC_BLUEPRINTS,
  TREE_SERVICE: TREE_SERVICE_BLUEPRINTS,
  HVAC: HVAC_BLUEPRINTS,
};

const DEFAULT_FAMILY_BY_INDUSTRY: Record<SupportedIndustry, string> = {
  PLUMBING: "general-plumbing",
  SEPTIC: "septic-tank-pumping",
  TREE_SERVICE: "tree-removal",
  HVAC: "ac-repair",
};

const GUARANTEED_FAMILIES_BY_INDUSTRY: Record<SupportedIndustry, string[]> = {
  PLUMBING: [
    "drain-cleaning",
    "leak-repair",
    "emergency-plumbing",
    "water-heater-repair-replacement",
    "toilet-repair",
    "faucets-fixtures",
    "sewer-line",
    "hydro-jetting",
    "maintenance",
  ],
    SEPTIC: [
    "septic-tank-pumping",
    "system-inspection",
    "septic-repair",
    "septic-maintenance",
    "drain-field-repair",
    "emergency-septic",
    "sewer-line-septic",
    "lift-pump-service",
  ],
    TREE_SERVICE: [
    "tree-removal",
    "tree-trimming",
    "storm-cleanup",
    "stump-grinding",
    "plant-health-care",
    "tree-planting",
    "tree-cabling",
    "brush-removal",
  ],
  HVAC: [
    "general-hvac",
    "ac-repair",
    "ac-replacement",
    "furnace-repair",
    "furnace-installation",
    "hvac-repair",
    "hvac-installation",
    "hvac-maintenance",
    "emergency-hvac",
    "no-heat-no-ac",
    "seasonal-tune-ups",
    "maintenance-plans",
    "indoor-air-quality",
    "duct-cleaning-sealing",
    "heat-pump-service",
    "ductless-mini-split-service",
    "ductless-mini-split-installation",
  ],
};

export function getSupportedIndustryFromProfile(profile: {
  industryLabel?: string | null;
  preferredServices?: string[] | null;
  businessName?: string | null;
}): SupportedIndustry {
  const normalizedIndustryLabel = normalizeIndustryLabel(profile.industryLabel);

  if (normalizedIndustryLabel.includes("septic")) return "SEPTIC";
  if (normalizedIndustryLabel.includes("tree")) return "TREE_SERVICE";
  if (
    normalizedIndustryLabel.includes("hvac") ||
    normalizedIndustryLabel.includes("heating") ||
    normalizedIndustryLabel.includes("cooling")
  ) {
    return "HVAC";
  }
  if (normalizedIndustryLabel.includes("plumb")) return "PLUMBING";

  const searchable = [
    ...(profile.preferredServices ?? []),
    profile.businessName ?? "",
  ]
    .join(" ")
    .toLowerCase();

  if (searchable.includes("septic")) return "SEPTIC";
  if (searchable.includes("tree")) return "TREE_SERVICE";
  if (
    searchable.includes("hvac") ||
    searchable.includes("heating") ||
    searchable.includes("cooling") ||
    searchable.includes("air condition")
  ) {
    return "HVAC";
  }

  return "PLUMBING";
}

export function getIndustryServiceDefinitions(
  industry: SupportedIndustry
): ServiceBlueprint[] {
  return INDUSTRY_BLUEPRINTS[industry] ?? INDUSTRY_BLUEPRINTS.PLUMBING;
}

export function getIndustryCapabilityFamilyKeys(
  industry: SupportedIndustry
): Set<string> {
  return new Set(
    (INDUSTRY_BLUEPRINTS[industry] ?? INDUSTRY_BLUEPRINTS.PLUMBING).map(
      (blueprint) => blueprint.familyKey
    )
  );
}

export function isFamilyCompatibleWithIndustry(
  familyKey: string,
  industry: SupportedIndustry
): boolean {
  return getIndustryCapabilityFamilyKeys(industry).has(familyKey);
}

export function getGuaranteedFamilyKeys(industry: SupportedIndustry): string[] {
  return GUARANTEED_FAMILIES_BY_INDUSTRY[industry] ?? GUARANTEED_FAMILIES_BY_INDUSTRY.PLUMBING;
}

export function getBlueprintForFamily(
  familyKey: string,
  industry: SupportedIndustry
): ServiceBlueprint {
  const industryBlueprints = getIndustryServiceDefinitions(industry);

  return (
    industryBlueprints.find((blueprint) => blueprint.familyKey === familyKey) ??
    industryBlueprints.find(
      (blueprint) => blueprint.familyKey === DEFAULT_FAMILY_BY_INDUSTRY[industry]
    ) ??
    INDUSTRY_BLUEPRINTS.PLUMBING.find(
      (blueprint) => blueprint.familyKey === "general-plumbing"
    )!
  );
}

function findAliasMatch(
  serviceName: string,
  industry: SupportedIndustry
): ServiceBlueprint | null {
  const normalizedServiceName = normalize(serviceName);
  const industryBlueprints = getIndustryServiceDefinitions(industry);

  const exact =
    industryBlueprints.find((blueprint) =>
      [blueprint.serviceName, ...blueprint.aliases]
        .map(normalize)
        .some((value) => value === normalizedServiceName)
    ) ?? null;

  if (exact) {
    return exact;
  }

  const contains =
    industryBlueprints.find((blueprint) =>
      [blueprint.serviceName, ...blueprint.aliases]
        .map(normalize)
        .some(
          (value) =>
            normalizedServiceName.includes(value) || value.includes(normalizedServiceName)
        )
    ) ?? null;

  return contains;
}

export function getServiceFamilyKey(
  serviceName: string,
  industry: SupportedIndustry
): string {
  const aliasMatch = findAliasMatch(serviceName, industry);
  if (aliasMatch) {
    return aliasMatch.familyKey;
  }

  const normalizedServiceName = normalize(serviceName);

  if (industry === "PLUMBING") {
    if (
      normalizedServiceName.includes("hydro jet") ||
      normalizedServiceName.includes("jetting")
    ) {
      return "hydro-jetting";
    }
    if (
      normalizedServiceName.includes("camera inspection") ||
      normalizedServiceName.includes("sewer camera") ||
      normalizedServiceName.includes("drain camera") ||
      normalizedServiceName.includes("pipe camera")
    ) {
      return "sewer-camera";
    }
        if (
      normalizedServiceName.includes("burst pipe") ||
      normalizedServiceName.includes("broken pipe repair")
    ) {
      return "burst-pipe-repair";
    }

    if (
      normalizedServiceName.includes("slab leak") ||
      normalizedServiceName.includes("foundation leak")
    ) {
      return "slab-leak-repair";
    }

    if (
      normalizedServiceName.includes("tankless water heater") ||
      normalizedServiceName.includes("tankless hot water heater") ||
      normalizedServiceName.includes("tankless install") ||
      normalizedServiceName.includes("tankless replacement") ||
      normalizedServiceName.includes("tankless repair")
    ) {
      return "tankless-water-heater";
    }

    if (
      normalizedServiceName.includes("water heater service") ||
      normalizedServiceName.includes("water heater maintenance") ||
      normalizedServiceName.includes("water heater flush") ||
      normalizedServiceName.includes("water heater tune up")
    ) {
      return "water-heater-service";
    }

    if (
      normalizedServiceName.includes("water heater repair") ||
      normalizedServiceName.includes("water heater replacement") ||
      normalizedServiceName.includes("water heater repair and replacement") ||
      normalizedServiceName.includes("hot water heater repair") ||
      normalizedServiceName.includes("hot water heater replacement")
    ) {
      return "water-heater-repair-replacement";
    }

    if (
      normalizedServiceName.includes("garbage disposal") ||
      normalizedServiceName.includes("disposal repair") ||
      normalizedServiceName.includes("disposal installation")
    ) {
      return "garbage-disposal";
    }

    if (
      normalizedServiceName.includes("water softener") ||
      normalizedServiceName.includes("softener installation")
    ) {
      return "water-softener";
    }

    if (
      normalizedServiceName.includes("custom home plumbing") ||
      normalizedServiceName.includes("new construction plumbing") ||
      normalizedServiceName.includes("new build plumbing") ||
      normalizedServiceName.includes("rough in plumbing")
    ) {
      return "custom-home-plumbing-installation";
    }
    if (
      normalizedServiceName.includes("faucet") ||
      normalizedServiceName.includes("fixture")
    ) {
      return "faucets-fixtures";
    }
    if (
      normalizedServiceName.includes("gas line") ||
      normalizedServiceName.includes("gas piping") ||
      normalizedServiceName.includes("gas leak")
    ) {
      return "gas-line";
    }
        if (
      normalizedServiceName.includes("repipe") ||
      normalizedServiceName.includes("repipes") ||
      normalizedServiceName.includes("repiping") ||
      normalizedServiceName.includes("pipe replacement")
    ) {
      return "repiping";
    }
    if (
      normalizedServiceName.includes("sewer") ||
      normalizedServiceName.includes("main line") ||
      normalizedServiceName.includes("trenchless")
    ) {
      return "sewer-line";
    }
    if (normalizedServiceName.includes("sump pump")) {
      return "sump-pump";
    }
    if (normalizedServiceName.includes("toilet")) {
      return "toilet-repair";
    }
        if (normalizedServiceName.includes("water heater")) {
      return "water-heater-repair-replacement";
    }
    if (
      normalizedServiceName.includes("drain") ||
      normalizedServiceName.includes("clog") ||
      normalizedServiceName.includes("rooter")
    ) {
      return "drain-cleaning";
    }
        if (normalizedServiceName.includes("leak")) {
      return "leak-repair";
    }
        if (
      normalizedServiceName.includes("emergency") ||
      normalizedServiceName.includes("24 hour") ||
      normalizedServiceName.includes("24/7") ||
      normalizedServiceName.includes("24 7") ||
      normalizedServiceName.includes("after hours")
    ) {
      return "emergency-plumbing";
    }
    if (
      normalizedServiceName.includes("maintenance") ||
      normalizedServiceName.includes("inspection") ||
      normalizedServiceName.includes("checkup") ||
      normalizedServiceName.includes("tune up")
    ) {
      return "maintenance";
    }
  }

  if (industry === "SEPTIC") {
    if (normalizedServiceName.includes("grease trap")) return "grease-trap-cleaning";
    if (normalizedServiceName.includes("lift pump")) return "lift-pump-service";
        if (
      normalizedServiceName.includes("emergency septic") ||
      normalizedServiceName.includes("septic backup") ||
      normalizedServiceName.includes("septic overflow") ||
      normalizedServiceName.includes("sewage backup") ||
      normalizedServiceName.includes("emergency service") ||
      normalizedServiceName.includes("24/7 emergency service") ||
      normalizedServiceName.includes("24 7 emergency service")
    ) {
      return "emergency-septic";
    }

    if (
      normalizedServiceName.includes("septic repair") ||
      normalizedServiceName.includes("septic tank repair") ||
      normalizedServiceName.includes("septic system repair") ||
      normalizedServiceName.includes("baffle repair") ||
      normalizedServiceName.includes("tank repair")
    ) {
      return "septic-repair";
    }

    if (
      normalizedServiceName.includes("septic maintenance") ||
      normalizedServiceName.includes("system maintenance") ||
      normalizedServiceName.includes("annual septic maintenance") ||
      normalizedServiceName.includes("septic tune up") ||
      normalizedServiceName.includes("maintenance plan")
    ) {
      return "septic-maintenance";
    }
    if (
      normalizedServiceName.includes("drain field") ||
      normalizedServiceName.includes("leach field")
    ) {
      return "drain-field-repair";
    }
    if (normalizedServiceName.includes("inspection")) return "system-inspection";
    if (
      normalizedServiceName.includes("installation") ||
      normalizedServiceName.includes("new septic")
    ) {
      return "septic-installation";
    }
    if (
      normalizedServiceName.includes("sewer line") ||
      normalizedServiceName.includes("main line")
    ) {
      return "sewer-line-septic";
    }
    if (
      normalizedServiceName.includes("riser") ||
      normalizedServiceName.includes("lid")
    ) {
      return "riser-lid-installation";
    }
    if (
      normalizedServiceName.includes("pumping") ||
      normalizedServiceName.includes("septic tank")
    ) {
      return "septic-tank-pumping";
    }
  }

    if (industry === "TREE_SERVICE") {
    if (
      normalizedServiceName.includes("storm") ||
      (normalizedServiceName.includes("emergency") &&
        normalizedServiceName.includes("service"))
    ) {
      return "storm-cleanup";
    }

    if (normalizedServiceName.includes("stump")) return "stump-grinding";
        if (
      normalizedServiceName.includes("tree cabling") ||
      normalizedServiceName.includes("tree bracing") ||
      normalizedServiceName.includes("tree support system") ||
      normalizedServiceName.includes("structural support")
    ) {
      return "tree-cabling";
    }

    if (
      normalizedServiceName.includes("tree planting") ||
      normalizedServiceName.includes("tree transplanting") ||
      normalizedServiceName.includes("tree installation") ||
      normalizedServiceName.includes("plant a tree") ||
      normalizedServiceName.includes("transplant tree")
    ) {
      return "tree-planting";
    }

    if (
      normalizedServiceName.includes("brush removal") ||
      normalizedServiceName.includes("debris hauling") ||
      normalizedServiceName.includes("yard debris removal") ||
      normalizedServiceName.includes("brush hauling") ||
      normalizedServiceName.includes("tree debris cleanup")
    ) {
      return "brush-removal";
    }
    if (
      normalizedServiceName.includes("arborist") ||
      normalizedServiceName.includes("risk assessment")
    ) {
      return "arborist-consultation";
    }
    if (
      normalizedServiceName.includes("lot clearing") ||
      normalizedServiceName.includes("land clearing")
    ) {
      return "lot-clearing";
    }
    if (
      normalizedServiceName.includes("disease") ||
      normalizedServiceName.includes("pest")
    ) {
      return "disease-pest-management";
    }
    if (
      normalizedServiceName.includes("plant health") ||
      normalizedServiceName.includes("fertilization") ||
      normalizedServiceName.includes("deep root")
    ) {
      return "plant-health-care";
    }
    if (
      normalizedServiceName.includes("trimming") ||
      normalizedServiceName.includes("pruning") ||
      normalizedServiceName.includes("canopy")
    ) {
      return "tree-trimming";
    }
    if (
      normalizedServiceName.includes("removal") ||
      normalizedServiceName.includes("hazardous tree")
    ) {
      return "tree-removal";
    }
  }

  if (industry === "HVAC") {
    if (
      normalizedServiceName.includes("ductless mini split installation") ||
      normalizedServiceName.includes("ductless mini split install") ||
      normalizedServiceName.includes("mini split installation") ||
      normalizedServiceName.includes("mini split install")
    ) {
      return "ductless-mini-split-installation";
    }

    if (
      normalizedServiceName.includes("ductless mini split") ||
      normalizedServiceName.includes("mini split")
    ) {
      return "ductless-mini-split-service";
    }

    if (
      normalizedServiceName.includes("no heat") ||
      normalizedServiceName.includes("no ac") ||
      normalizedServiceName.includes("no cooling") ||
      normalizedServiceName.includes("ac not working") ||
      normalizedServiceName.includes("heat not working") ||
      normalizedServiceName.includes("furnace not working")
    ) {
      return "no-heat-no-ac";
    }

    if (
      normalizedServiceName.includes("emergency") ||
      normalizedServiceName.includes("24 hour") ||
      normalizedServiceName.includes("24/7") ||
      normalizedServiceName.includes("24 7") ||
      normalizedServiceName.includes("after hours")
    ) {
      return "emergency-hvac";
    }

    if (
      normalizedServiceName.includes("maintenance plan") ||
      normalizedServiceName.includes("maintenance agreement") ||
      normalizedServiceName.includes("service agreement") ||
      normalizedServiceName.includes("service plan")
    ) {
      return "maintenance-plans";
    }

    if (
      normalizedServiceName.includes("hvac maintenance") ||
      normalizedServiceName.includes("heating and cooling maintenance") ||
      normalizedServiceName.includes("furnace and air conditioning maintenance") ||
      normalizedServiceName.includes("preventative maintenance") ||
      normalizedServiceName.includes("preventive maintenance") ||
      normalizedServiceName.includes("routine maintenance")
    ) {
      return "hvac-maintenance";
    }

    if (
      normalizedServiceName.includes("tune up") ||
      normalizedServiceName.includes("checkup") ||
      normalizedServiceName.includes("seasonal maintenance")
    ) {
      return "seasonal-tune-ups";
    }

    if (
      normalizedServiceName.includes("indoor air quality") ||
      normalizedServiceName.includes("air quality") ||
      normalizedServiceName.includes("iaq") ||
      normalizedServiceName.includes("air purifier") ||
      normalizedServiceName.includes("air purification") ||
      normalizedServiceName.includes("humidity") ||
      normalizedServiceName.includes("dehumidifier")
    ) {
      return "indoor-air-quality";
    }

    if (
      normalizedServiceName.includes("duct cleaning") ||
      normalizedServiceName.includes("duct sealing") ||
      normalizedServiceName.includes("ductwork") ||
      normalizedServiceName.includes("air duct") ||
      normalizedServiceName.includes("duct care")
    ) {
      return "duct-cleaning-sealing";
    }

    if (normalizedServiceName.includes("heat pump")) {
      return "heat-pump-service";
    }

    if (
      normalizedServiceName.includes("furnace install") ||
      normalizedServiceName.includes("furnace installation") ||
      normalizedServiceName.includes("furnace replacement") ||
      normalizedServiceName.includes("heater replacement") ||
      normalizedServiceName.includes("heater installation")
    ) {
      return "furnace-installation";
    }

    if (
      normalizedServiceName.includes("ac replacement") ||
      normalizedServiceName.includes("air conditioning replacement") ||
      normalizedServiceName.includes("air conditioner replacement") ||
      normalizedServiceName.includes("ac install") ||
      normalizedServiceName.includes("ac installation")
    ) {
      return "ac-replacement";
    }

    if (
      normalizedServiceName.includes("hvac installation") ||
      normalizedServiceName.includes("hvac installations") ||
      normalizedServiceName.includes("hvac install") ||
      normalizedServiceName.includes("hvac installs") ||
      normalizedServiceName.includes("installation and maintenance")
    ) {
      return "hvac-installation";
    }

    if (
      normalizedServiceName.includes("hvac repair") ||
      normalizedServiceName.includes("hvac repairs") ||
      normalizedServiceName.includes("repair hvac") ||
      normalizedServiceName.includes("part updates") ||
      normalizedServiceName.includes("repairs to address hvac") ||
      normalizedServiceName.includes("hvac issues")
    ) {
      return "hvac-repair";
    }

    if (
      normalizedServiceName.includes("furnace") ||
      normalizedServiceName.includes("heating") ||
      normalizedServiceName.includes("heater")
    ) {
      return "furnace-repair";
    }

    if (
      normalizedServiceName.includes("ac") ||
      normalizedServiceName.includes("air conditioning") ||
      normalizedServiceName.includes("cooling")
    ) {
      return "ac-repair";
    }

    if (
      normalizedServiceName.includes("residential hvac") ||
      normalizedServiceName.includes("commercial hvac") ||
      normalizedServiceName.includes("new construction hvac") ||
      normalizedServiceName === "hvac" ||
      normalizedServiceName === "hvac service" ||
      normalizedServiceName === "hvac services" ||
      normalizedServiceName.includes("heating and cooling") ||
      normalizedServiceName.includes("home comfort")
    ) {
      return "general-hvac";
    }
  }

  return DEFAULT_FAMILY_BY_INDUSTRY[industry];
}