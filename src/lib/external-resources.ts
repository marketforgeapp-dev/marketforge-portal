export const EXTERNAL_RESOURCE_CONFIG = [
  {
    slug: "action-execution-guide",
    title: "Action Execution Guide",
    eyebrow: "Execution",
    description:
      "How actions move from approval to launch, what timing to expect, and what responsibilities sit with MarketForge versus your team.",
    adminSummary:
      "How actions move from approval to launch, including lifecycle, timing, responsibilities, and attribution guidance.",
  },
  {
    slug: "lead-capture-guide",
    title: "Lead & Revenue Reporting Guide",
    eyebrow: "Reporting",
    description:
      "How to report booked jobs and revenue clearly so MarketForge can connect actions to measurable business outcomes.",
    adminSummary:
      "How customers should report booked jobs and revenue so MarketForge can match outcomes back to launched work.",
  },
  {
    slug: "terms-and-conditions",
    title: "Terms & Conditions",
    eyebrow: "Policy",
    description:
      "The core service terms, platform fee boundaries, attribution expectations, and customer responsibilities.",
    adminSummary:
      "Core service terms, customer responsibilities, platform fee boundaries, and liability language.",
  },
  {
    slug: "privacy-policy",
    title: "Privacy Policy",
    eyebrow: "Policy",
    description:
      "How business information, credentials, and access are handled, protected, and removed when no longer needed.",
    adminSummary:
      "How business information, credentials, and access are handled, retained, and protected.",
  },
  {
    slug: "execution-access-guide",
    title: "Execution Access Guide",
    eyebrow: "Access",
    description:
      "What access may be required to execute actions, the preferred permissions-based approach, and how access can be revoked.",
    adminSummary:
      "How execution access should be provided, why permissions are preferred, and how access is removed.",
  },
  {
    slug: "support-contact",
    title: "Support & Contact",
    eyebrow: "Support",
    description:
      "How to get help, what support covers, and where to reach the MarketForge team when you need assistance.",
    adminSummary:
      "How customers can reach MarketForge for support and what help is available.",
  },
] as const;

export type ExternalResourceConfigItem =
  (typeof EXTERNAL_RESOURCE_CONFIG)[number];