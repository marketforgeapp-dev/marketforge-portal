import type { SupportedIndustry } from "@/lib/industry-service-map";

export type IndustryCopy = {
  industryLabel: string;
  servicePageLabel: string;
  faqLabel: string;
  googleBusinessLabel: string;
  servicePageExamples: string[];
  faqExamples: string[];
  contentExamples: string[];
  aeoPrioritySummary: string;
  recommendationTemplates: {
    faq: string;
    servicePages: string;
    contentLayer: string;
    googleBusiness: string;
    authority: string;
  };
};

const INDUSTRY_COPY: Record<SupportedIndustry, IndustryCopy> = {
  PLUMBING: {
    industryLabel: "Plumbing",
    servicePageLabel: "Service Pages",
    faqLabel: "FAQ Content",
    googleBusinessLabel: "Google Business Profile",
    servicePageExamples: [
      "Drain cleaning",
      "Water heater service",
      "Leak repair",
      "Sewer line service",
    ],
    faqExamples: [
      "When should I call for drain cleaning?",
      "What are signs of a water heater replacement?",
      "How much does leak repair typically cost?",
    ],
    contentExamples: [
      "Emergency plumbing response",
      "Water heater comparisons",
      "Homeowner plumbing FAQs",
    ],
    aeoPrioritySummary:
      "Plumbing visibility improves when core services, homeowner FAQs, and local trust signals are clearly represented.",
    recommendationTemplates: {
      faq: "Expand FAQ coverage around common homeowner plumbing questions and emergency service concerns.",
      servicePages:
        "Strengthen dedicated pages for core plumbing services so MarketForge can support more search intents.",
      contentLayer:
        "Add educational content that supports homeowner questions, urgency triggers, and service comparisons.",
      googleBusiness:
        "Tighten Google Business Profile coverage to strengthen local entity trust and answer-engine visibility.",
      authority:
        "Reinforce local expertise signals with clearer service proof, trust language, and location relevance.",
    },
  },

  SEPTIC: {
    industryLabel: "Septic",
    servicePageLabel: "Service Pages",
    faqLabel: "FAQ Content",
    googleBusinessLabel: "Google Business Profile",
    servicePageExamples: [
      "Septic tank pumping",
      "System inspection",
      "Drain field repair",
      "Sewer line repair",
    ],
    faqExamples: [
      "How often should a septic tank be pumped?",
      "What are signs of drain field trouble?",
      "When is a septic inspection needed?",
    ],
    contentExamples: [
      "Routine pumping guidance",
      "Inspection education",
      "Drain field warning signs",
    ],
    aeoPrioritySummary:
      "Septic visibility improves when service pages and FAQs clearly answer maintenance, inspection, and failure-prevention questions.",
    recommendationTemplates: {
      faq: "Add FAQ coverage around pumping schedules, inspections, warning signs, and homeowner maintenance questions.",
      servicePages:
        "Build out dedicated service pages for pumping, inspections, drain field work, and related septic services.",
      contentLayer:
        "Add educational content that helps homeowners understand maintenance cycles, system risk, and repair decisions.",
      googleBusiness:
        "Strengthen Google Business Profile coverage to improve local trust and discovery for septic services.",
      authority:
        "Show clearer local expertise around septic maintenance, inspections, repairs, and system troubleshooting.",
    },
  },

  TREE_SERVICE: {
    industryLabel: "Tree Service",
    servicePageLabel: "Service Pages",
    faqLabel: "FAQ Content",
    googleBusinessLabel: "Google Business Profile",
    servicePageExamples: [
      "Tree removal",
      "Pruning & trimming",
      "Stump grinding",
      "Emergency storm service",
    ],
    faqExamples: [
      "When should a tree be removed?",
      "How often should trees be trimmed?",
      "What counts as emergency storm service?",
    ],
    contentExamples: [
      "Hazard tree guidance",
      "Storm cleanup education",
      "Seasonal tree care tips",
    ],
    aeoPrioritySummary:
      "Tree service visibility improves when safety, storm response, maintenance, and homeowner decision questions are covered clearly.",
    recommendationTemplates: {
      faq: "Expand FAQ coverage around removal decisions, storm damage, trimming cycles, and homeowner safety questions.",
      servicePages:
        "Strengthen dedicated pages for tree removal, trimming, stump grinding, storm work, and related services.",
      contentLayer:
        "Publish content that helps homeowners evaluate tree risk, maintenance timing, and storm response needs.",
      googleBusiness:
        "Improve Google Business Profile completeness to strengthen local trust for tree-service searches.",
      authority:
        "Reinforce local authority through safety-focused messaging, service proof, and property-risk expertise.",
    },
  },

  HVAC: {
    industryLabel: "HVAC",
    servicePageLabel: "Service Pages",
    faqLabel: "FAQ Content",
    googleBusinessLabel: "Google Business Profile",
    servicePageExamples: [
      "AC repair",
      "Heating repair",
      "Maintenance",
      "System replacement",
    ],
    faqExamples: [
      "When should I repair vs replace my HVAC system?",
      "What does seasonal maintenance include?",
      "What are signs my AC system is failing?",
    ],
    contentExamples: [
      "Seasonal maintenance education",
      "Repair vs replacement guidance",
      "Indoor comfort FAQs",
    ],
    aeoPrioritySummary:
      "HVAC visibility improves when repair, maintenance, replacement, and homeowner comfort questions are covered clearly.",
    recommendationTemplates: {
      faq: "Expand FAQ coverage around repair vs replacement, maintenance timing, efficiency, and comfort concerns.",
      servicePages:
        "Build out dedicated pages for AC repair, heating repair, maintenance, and replacement services.",
      contentLayer:
        "Add educational content that supports seasonal demand, system comparison, and homeowner comfort questions.",
      googleBusiness:
        "Strengthen Google Business Profile completeness to improve local trust and answer-engine visibility.",
      authority:
        "Show clearer local expertise around HVAC repair, maintenance, replacement, and comfort planning.",
    },
  },
};

export function getIndustryCopy(
  industry: SupportedIndustry | string | null | undefined
): IndustryCopy {
  if (industry === "SEPTIC") return INDUSTRY_COPY.SEPTIC;
  if (industry === "TREE_SERVICE") return INDUSTRY_COPY.TREE_SERVICE;
  if (industry === "HVAC") return INDUSTRY_COPY.HVAC;
  return INDUSTRY_COPY.PLUMBING;
}