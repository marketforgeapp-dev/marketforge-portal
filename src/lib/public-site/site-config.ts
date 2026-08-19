import { MARKETFORGE_TERMINOLOGY } from "./terminology";

export const PUBLIC_SITE_CONFIG = {
  name: MARKETFORGE_TERMINOLOGY.name,
  legalName: MARKETFORGE_TERMINOLOGY.legalName,
  url: MARKETFORGE_TERMINOLOGY.domain,

  defaultTitle:
    "MarketForge | Growth Execution Platform for Local Service Businesses",

  defaultDescription:
    "MarketForge helps local service businesses identify worthwhile growth opportunities, choose what deserves attention, turn decisions into execution, and connect the work to real business outcomes.",

  founder: {
    name: "Patrick Donovan",
    jobTitle: "Founder",
  },
} as const;

export function absolutePublicUrl(path = "/") {
  return new URL(path, PUBLIC_SITE_CONFIG.url).toString();
}