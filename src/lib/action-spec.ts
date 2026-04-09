import type { OpportunityType, CampaignType } from "@/generated/prisma";

export type ActionConstructType =
  | "DEMAND_CAPTURE"
  | "CAPACITY_FILL"
  | "POSITIONING"
  | "REVIEW_ACQUISITION"
  | "REACTIVATION"
  | "OFFER_PROMOTION"
  | "SERVICE_BUNDLE_UPSELL"
  | "LOCAL_VISIBILITY"
  | "AEO_SEO_VISIBILITY";

export type SecondaryConstructType =
  | "URGENCY"
  | "SEASONAL_TIMING"
  | "TRUST_PROOF"
  | "OFFER"
  | "BUNDLE"
  | "REACTIVATION"
  | null;

export type ActionBusinessGoal =
  | "generate_immediate_jobs"
  | "fill_schedule"
  | "increase_conversion_rate"
  | "increase_reviews"
  | "reactivate_customers"
  | "increase_local_visibility"
  | "improve_search_presence"
  | "promote_higher_value_work"
  | "increase_repeat_business";

export type AudienceSourceType =
  | "prospective_local_homeowners"
  | "past_customers"
  | "recent_customers"
  | "inactive_leads"
  | "broad_local_visibility"
  | "website_visitors"
  | "unknown_manual_selection";

export type ActionOfferType =
  | "percentage_discount"
  | "fixed_discount"
  | "free_add_on"
  | "bundle"
  | "financing"
  | "priority_scheduling"
  | "warranty"
  | "inspection_offer"
  | "none";

export type ActionExecutionMode =
  | "manual_operator"
  | "manual_business"
  | "hybrid_manual_ready_for_automation"
  | "automated";

export type ActionAutomationEligibility =
  | "manual_only"
  | "automation_ready"
  | "automation_possible_with_integration"
  | "automation_enabled";

export type ActionExecutionMechanism = {
  channelType: string;
  triggerType: string;
  deliverySurface: string;
  operatorActionSummary: string;
  requiredAssets: string[];
  requiredAccess: string[];
  manualSteps: string[];
  futureAutomationHook: string;
};

export type ActionOperationalDependencies = {
  business_readiness: string[];
  offer_readiness: string[];
  asset_readiness: string[];
  channel_access: string[];
  tracking_readiness: string[];
  staff_behavior: string[];
  website_or_landing_readiness: string[];
};

export type ActionSpec = {
  constructType: ActionConstructType;
  secondaryConstructType: SecondaryConstructType;
  businessGoal: ActionBusinessGoal;
  actionName: string;
  targetService: string;
  targetAudience: string;
  audienceRationale: string;
  audienceSourceType: AudienceSourceType;
  offerType: ActionOfferType;
  offerLabel: string | null;
  offerValue: string | null;
  offerDuration: string | null;
  offerConditions: string | null;
  offerFulfillmentNotes: string | null;
  coreMessageAngle: string;
  cta: string;
  proofOrDifferentiator: string | null;
  messageGuardrails: string[];
  whatHappensWhenLaunched: string;
  operationalDependencies: ActionOperationalDependencies;
  executionMechanism: ActionExecutionMechanism;
  executionMode: ActionExecutionMode;
  automationEligibility: ActionAutomationEligibility;
};

function normalizeText(value?: string | null) {
  return (value ?? "").trim();
}

function normalizeLower(value?: string | null) {
  return normalizeText(value).toLowerCase();
}

function looksLikePlaceholderOffer(value?: string | null) {
  const text = normalizeLower(value);

  if (!text) return true;

  const invalidFragments = [
    "relevant",
    "simple local offer",
    "compelling local service offer",
    "stronger answer-engine coverage",
    "premium service",
    "trusted experts",
    "review-backed",
    "simple review request",
    "broad",
    "local service offer",
  ];

  return invalidFragments.some((fragment) => text.includes(fragment));
}

function looksLikeReviewAction(params: {
  routedLane?: string | null;
  actionType?: string | null;
  campaignType?: string | null;
  actionName?: string | null;
  actionSummary?: string | null;
}) {
  const haystack = [
    params.routedLane,
    params.actionType,
    params.campaignType,
    params.actionName,
    params.actionSummary,
  ]
    .map(normalizeLower)
    .join(" ");

  return (
    haystack.includes("review") ||
    haystack.includes("reputation") ||
    haystack.includes("completed-job")
  );
}

function looksLikeVisibilityAction(params: {
  routedLane?: string | null;
  actionType?: string | null;
  campaignType?: string | null;
  opportunityType?: OpportunityType | null;
  actionName?: string | null;
  actionSummary?: string | null;
}) {
  const haystack = [
    params.routedLane,
    params.actionType,
    params.campaignType,
    params.opportunityType,
    params.actionName,
    params.actionSummary,
  ]
    .map(normalizeLower)
    .join(" ");

  return (
    haystack.includes("aeo") ||
    haystack.includes("seo") ||
    haystack.includes("visibility") ||
    haystack.includes("faq") ||
    haystack.includes("answer") ||
    haystack.includes("local visibility") ||
    params.opportunityType === "AI_SEARCH_VISIBILITY"
  );
}

function looksLikeCapacityAction(params: {
  routedLane?: string | null;
  actionType?: string | null;
  opportunityType?: OpportunityType | null;
  actionName?: string | null;
  actionSummary?: string | null;
}) {
  const haystack = [
    params.routedLane,
    params.actionType,
    params.opportunityType,
    params.actionName,
    params.actionSummary,
  ]
    .map(normalizeLower)
    .join(" ");

  return (
    haystack.includes("capacity") ||
    haystack.includes("fill schedule") ||
    haystack.includes("schedule fill") ||
    params.opportunityType === "CAPACITY_GAP"
  );
}

function looksLikeReactivationAction(params: {
  actionName?: string | null;
  actionSummary?: string | null;
  rawAudience?: string | null;
}) {
  const haystack = [
    params.actionName,
    params.actionSummary,
    params.rawAudience,
  ]
    .map(normalizeLower)
    .join(" ");

  return (
    haystack.includes("past customer") ||
    haystack.includes("reactivation") ||
    haystack.includes("reminder") ||
    haystack.includes("repeat customer")
  );
}

function looksLikePositioningAction(params: {
  actionName?: string | null;
  actionSummary?: string | null;
}) {
  const haystack = [params.actionName, params.actionSummary]
    .map(normalizeLower)
    .join(" ");

  return (
    haystack.includes("premium") ||
    haystack.includes("trust") ||
    haystack.includes("expert") ||
    haystack.includes("same-day") ||
    haystack.includes("response") ||
    haystack.includes("licensed") ||
    haystack.includes("warranty")
  );
}

function inferConstructType(params: {
  routedLane?: string | null;
  actionType?: string | null;
  opportunityType?: OpportunityType | null;
  campaignType?: CampaignType | null;
  hasRealOffer: boolean;
  actionName?: string | null;
  actionSummary?: string | null;
  rawAudience?: string | null;
}): ActionConstructType {
  if (
    looksLikeReviewAction({
      routedLane: params.routedLane,
      actionType: params.actionType,
      campaignType: params.campaignType,
      actionName: params.actionName,
      actionSummary: params.actionSummary,
    })
  ) {
    return "REVIEW_ACQUISITION";
  }

  if (
    looksLikeReactivationAction({
      actionName: params.actionName,
      actionSummary: params.actionSummary,
      rawAudience: params.rawAudience,
    })
  ) {
    return "REACTIVATION";
  }

  if (
    looksLikeVisibilityAction({
      routedLane: params.routedLane,
      actionType: params.actionType,
      campaignType: params.campaignType,
      opportunityType: params.opportunityType,
      actionName: params.actionName,
      actionSummary: params.actionSummary,
    })
  ) {
    return "AEO_SEO_VISIBILITY";
  }

  if (
    looksLikeCapacityAction({
      routedLane: params.routedLane,
      actionType: params.actionType,
      opportunityType: params.opportunityType,
      actionName: params.actionName,
      actionSummary: params.actionSummary,
    })
  ) {
    return "CAPACITY_FILL";
  }

  if (params.hasRealOffer) {
    return "OFFER_PROMOTION";
  }

  if (
    looksLikePositioningAction({
      actionName: params.actionName,
      actionSummary: params.actionSummary,
    })
  ) {
    return "POSITIONING";
  }

  return "DEMAND_CAPTURE";
}

function inferSecondaryConstructType(params: {
  constructType: ActionConstructType;
  opportunityType?: OpportunityType | null;
  hasRealOffer: boolean;
}): SecondaryConstructType {
  if (params.constructType === "OFFER_PROMOTION") {
    return null;
  }

  if (params.hasRealOffer) {
    return "OFFER";
  }

  if (params.opportunityType === "COMPETITOR_INACTIVE") {
    return "URGENCY";
  }

  if (params.opportunityType === "SEASONAL_DEMAND") {
    return "SEASONAL_TIMING";
  }

  return null;
}

function inferBusinessGoal(constructType: ActionConstructType): ActionBusinessGoal {
  switch (constructType) {
    case "CAPACITY_FILL":
      return "fill_schedule";
    case "REVIEW_ACQUISITION":
      return "increase_reviews";
    case "REACTIVATION":
      return "reactivate_customers";
    case "LOCAL_VISIBILITY":
      return "increase_local_visibility";
    case "AEO_SEO_VISIBILITY":
      return "improve_search_presence";
    case "POSITIONING":
      return "increase_conversion_rate";
    case "OFFER_PROMOTION":
      return "generate_immediate_jobs";
    case "SERVICE_BUNDLE_UPSELL":
      return "promote_higher_value_work";
    case "DEMAND_CAPTURE":
    default:
      return "generate_immediate_jobs";
  }
}

function inferAudience(params: {
  constructType: ActionConstructType;
  serviceArea: string;
  primaryService: string;
  actionSummary: string;
  rawAudience?: string | null;
}): {
  targetAudience: string;
  audienceRationale: string;
  audienceSourceType: AudienceSourceType;
} {
  const area = normalizeText(params.serviceArea) || "the service area";
  const service = normalizeText(params.primaryService) || "local service";
  const explicitAudience = normalizeText(params.rawAudience);

  if (explicitAudience) {
    switch (params.constructType) {
      case "REVIEW_ACQUISITION":
        return {
          targetAudience: explicitAudience,
          audienceRationale: "This audience is appropriate because review actions should be sent only to real recent customers.",
          audienceSourceType: "recent_customers",
        };
      case "REACTIVATION":
        return {
          targetAudience: explicitAudience,
          audienceRationale: "This audience is appropriate because reactivation actions should target existing customer relationships or known past demand.",
          audienceSourceType: "past_customers",
        };
      case "AEO_SEO_VISIBILITY":
        return {
          targetAudience: explicitAudience,
          audienceRationale: "This audience is appropriate because visibility work is aimed at discovery and comparison, not only immediate booking.",
          audienceSourceType: "broad_local_visibility",
        };
      default:
        return {
          targetAudience: explicitAudience,
          audienceRationale: "This audience is the intended commercial target for the action being launched.",
          audienceSourceType: "prospective_local_homeowners",
        };
    }
  }

  switch (params.constructType) {
    case "REVIEW_ACQUISITION":
      return {
        targetAudience: `Recent completed-job customers in ${area} who have not yet left a review`,
        audienceRationale: "This audience has already experienced the service, so a review request is credible and operationally appropriate.",
        audienceSourceType: "recent_customers",
      };

    case "REACTIVATION":
      return {
        targetAudience: `Past customers in ${area} who may be due for ${service.toLowerCase()} again`,
        audienceRationale: "This audience is more likely to respond because they already know the business and may reasonably need follow-up service.",
        audienceSourceType: "past_customers",
      };

    case "AEO_SEO_VISIBILITY":
      return {
        targetAudience: `Homeowners in ${area} searching for ${service.toLowerCase()} information and trusted local providers`,
        audienceRationale: "This audience matches visibility and discovery work rather than direct paid conversion only.",
        audienceSourceType: "broad_local_visibility",
      };

    case "CAPACITY_FILL":
      return {
        targetAudience: `Homeowners in ${area} with service needs that are easier to book this week`,
        audienceRationale: "This audience is best suited to lower-friction booking and schedule-fill actions.",
        audienceSourceType: "prospective_local_homeowners",
      };

    case "OFFER_PROMOTION":
      return {
        targetAudience: `Homeowners in ${area} actively considering ${service.toLowerCase()} and likely to respond to a clear offer`,
        audienceRationale: "This audience is closest to taking action when a real offer reduces friction or increases urgency.",
        audienceSourceType: "prospective_local_homeowners",
      };

    case "POSITIONING":
      return {
        targetAudience: `Homeowners in ${area} comparing providers for ${service.toLowerCase()} and looking for a trusted choice`,
        audienceRationale: "This audience is most likely to respond to stronger proof, differentiation, and credibility signals.",
        audienceSourceType: "prospective_local_homeowners",
      };

    case "DEMAND_CAPTURE":
    default:
      return {
        targetAudience: `Homeowners in ${area} who need ${service.toLowerCase()}`,
        audienceRationale: "This audience is the most commercially relevant group for near-term service demand.",
        audienceSourceType: "prospective_local_homeowners",
      };
  }
}

function inferOffer(params: {
  rawOffer?: string | null;
  constructType: ActionConstructType;
}): Pick<
  ActionSpec,
  | "offerType"
  | "offerLabel"
  | "offerValue"
  | "offerDuration"
  | "offerConditions"
  | "offerFulfillmentNotes"
> {
  const rawOffer = normalizeText(params.rawOffer);

  if (!rawOffer || looksLikePlaceholderOffer(rawOffer)) {
    return {
      offerType: "none",
      offerLabel: null,
      offerValue: null,
      offerDuration: null,
      offerConditions: null,
      offerFulfillmentNotes: null,
    };
  }

  const lower = rawOffer.toLowerCase();

  if (lower.includes("%")) {
    return {
      offerType: "percentage_discount",
      offerLabel: rawOffer,
      offerValue: rawOffer,
      offerDuration: null,
      offerConditions: null,
      offerFulfillmentNotes: "Confirm the business can honor this percentage discount before launch.",
    };
  }

  if (lower.includes("$")) {
    return {
      offerType: "fixed_discount",
      offerLabel: rawOffer,
      offerValue: rawOffer,
      offerDuration: null,
      offerConditions: null,
      offerFulfillmentNotes: "Confirm the business can honor this fixed discount before launch.",
    };
  }

  if (lower.includes("financing")) {
    return {
      offerType: "financing",
      offerLabel: rawOffer,
      offerValue: rawOffer,
      offerDuration: null,
      offerConditions: null,
      offerFulfillmentNotes: "Confirm financing terms are real and currently available before launch.",
    };
  }

  if (lower.includes("priority")) {
    return {
      offerType: "priority_scheduling",
      offerLabel: rawOffer,
      offerValue: rawOffer,
      offerDuration: null,
      offerConditions: null,
      offerFulfillmentNotes: "Confirm the team can operationally honor priority scheduling before launch.",
    };
  }

  if (lower.includes("bundle")) {
    return {
      offerType: "bundle",
      offerLabel: rawOffer,
      offerValue: rawOffer,
      offerDuration: null,
      offerConditions: null,
      offerFulfillmentNotes: "Confirm the included services and bundle delivery before launch.",
    };
  }

  if (lower.includes("free")) {
    return {
      offerType: "free_add_on",
      offerLabel: rawOffer,
      offerValue: rawOffer,
      offerDuration: null,
      offerConditions: null,
      offerFulfillmentNotes: "Confirm the business can honor this free add-on before launch.",
    };
  }

  if (lower.includes("warranty") || lower.includes("guarantee")) {
    return {
      offerType: "warranty",
      offerLabel: rawOffer,
      offerValue: rawOffer,
      offerDuration: null,
      offerConditions: null,
      offerFulfillmentNotes: "Confirm warranty or guarantee terms are real and currently available before launch.",
    };
  }

  return {
    offerType: params.constructType === "OFFER_PROMOTION" ? "inspection_offer" : "none",
    offerLabel: params.constructType === "OFFER_PROMOTION" ? rawOffer : null,
    offerValue: params.constructType === "OFFER_PROMOTION" ? rawOffer : null,
    offerDuration: null,
    offerConditions: null,
    offerFulfillmentNotes:
      params.constructType === "OFFER_PROMOTION"
        ? "Confirm the business can honor this offer before launch."
        : null,
  };
}

function inferExecutionMechanism(params: {
  constructType: ActionConstructType;
  targetService: string;
}): ActionExecutionMechanism {
  const service = normalizeText(params.targetService) || "the service";

  switch (params.constructType) {
    case "REVIEW_ACQUISITION":
      return {
        channelType: "review_request",
        triggerType: "post_service_completion",
        deliverySurface: "manual_operator_workflow",
        operatorActionSummary: "Send the approved review request workflow to recent completed-job customers.",
        requiredAssets: ["review request copy", "follow-up copy", "optional QR leave-behind"],
        requiredAccess: ["customer contact list"],
        manualSteps: [
          "Identify recent completed-job customers.",
          "Send the approved review request copy.",
          "Optionally use QR leave-behind or front-office follow-up.",
          "Stop follow-up after review is received or cadence limit is reached.",
        ],
        futureAutomationHook: "Trigger review request automatically after completed job status.",
      };

    case "AEO_SEO_VISIBILITY":
      return {
        channelType: "website_content",
        triggerType: "content_publish",
        deliverySurface: "website_cms",
        operatorActionSummary: "Publish the approved FAQ, answer, or service-page visibility content.",
        requiredAssets: ["FAQ content", "answer snippet", "SEO guidance"],
        requiredAccess: ["website or CMS access"],
        manualSteps: [
          "Open the correct page or content editor.",
          "Paste the approved content.",
          "Review formatting and service-area language.",
          "Publish the update and verify it is live.",
        ],
        futureAutomationHook: "Push approved structured content through CMS integration.",
      };

    case "CAPACITY_FILL":
    case "OFFER_PROMOTION":
    case "POSITIONING":
    case "DEMAND_CAPTURE":
    case "REACTIVATION":
    default:
      return {
        channelType: "manual_multi_channel_campaign",
        triggerType: "manual_launch",
        deliverySurface: "manual_operator_workflow",
        operatorActionSummary: `Launch the approved assets for ${service.toLowerCase()} across the selected channels.`,
        requiredAssets: ["approved copy", "approved creative", "CTA destination"],
        requiredAccess: ["channel account access", "business phone or booking destination"],
        manualSteps: [
          "Open the selected channel account.",
          "Paste the approved copy and load the approved creative.",
          "Confirm CTA, service area, and booking destination.",
          "Preview and publish the asset.",
        ],
        futureAutomationHook: "Create and launch approved channel assets through platform integrations.",
      };
  }
}

function inferOperationalDependencies(params: {
  constructType: ActionConstructType;
  hasRealOffer: boolean;
}): ActionOperationalDependencies {
  const base: ActionOperationalDependencies = {
    business_readiness: ["Business phone number and booking destination confirmed"],
    offer_readiness: [],
    asset_readiness: ["Approved copy and creative are ready for launch"],
    channel_access: ["Required channel credentials or account access are available"],
    tracking_readiness: ["Tracking destination or attribution destination is confirmed"],
    staff_behavior: [],
    website_or_landing_readiness: [],
  };

  if (params.hasRealOffer) {
    base.offer_readiness.push("Offer has been approved and can be honored operationally");
    base.staff_behavior.push("Team knows how to apply or honor the offer");
  }

  if (params.constructType === "REVIEW_ACQUISITION") {
    base.business_readiness.push("Recent completed-job customer list is available");
    base.staff_behavior.push("Review request timing and cadence are understood");
  }

  if (params.constructType === "AEO_SEO_VISIBILITY") {
    base.website_or_landing_readiness.push("Target website page or content surface is identified");
    base.website_or_landing_readiness.push("Publishing access is available");
  }

  return base;
}

export function buildActionSpec(params: {
  actionName: string;
  targetService: string;
  rawOffer?: string | null;
  rawAudience?: string | null;
  cta?: string | null;
  actionSummary?: string | null;
  actionType?: string | null;
  routedLane?: string | null;
  opportunityType?: OpportunityType | null;
  campaignType?: CampaignType | null;
  serviceArea: string;
}): ActionSpec {
  const normalizedOffer = normalizeText(params.rawOffer);
  const hasRealOffer = !looksLikePlaceholderOffer(normalizedOffer);

  const constructType = inferConstructType({
    routedLane: params.routedLane,
    actionType: params.actionType,
    opportunityType: params.opportunityType,
    campaignType: params.campaignType,
    hasRealOffer,
    actionName: params.actionName,
    actionSummary: params.actionSummary,
    rawAudience: params.rawAudience,
  });

  const secondaryConstructType = inferSecondaryConstructType({
    constructType,
    opportunityType: params.opportunityType,
    hasRealOffer,
  });

  const audience = inferAudience({
    constructType,
    serviceArea: params.serviceArea,
    primaryService: params.targetService,
    actionSummary: params.actionSummary ?? "",
    rawAudience: params.rawAudience,
  });

  const offer = inferOffer({
    rawOffer: params.rawOffer,
    constructType,
  });

  const executionMechanism = inferExecutionMechanism({
    constructType,
    targetService: params.targetService,
  });

  const operationalDependencies = inferOperationalDependencies({
    constructType,
    hasRealOffer,
  });

  return {
    constructType,
    secondaryConstructType,
    businessGoal: inferBusinessGoal(constructType),
    actionName: params.actionName,
    targetService: params.targetService,
    targetAudience: audience.targetAudience,
    audienceRationale: audience.audienceRationale,
    audienceSourceType: audience.audienceSourceType,
    offerType: offer.offerType,
    offerLabel: offer.offerLabel,
    offerValue: offer.offerValue,
    offerDuration: offer.offerDuration,
    offerConditions: offer.offerConditions,
    offerFulfillmentNotes: offer.offerFulfillmentNotes,
    coreMessageAngle:
      normalizeText(params.actionSummary) ||
      `Promote ${params.targetService.toLowerCase()} clearly and credibly.`,
    cta: normalizeText(params.cta) || "Book now",
    proofOrDifferentiator: null,
    messageGuardrails: [
      "Do not imply an offer unless a real offer exists.",
      "Do not use vague marketing language.",
      "Keep the service and audience explicit.",
      "Keep the CTA operationally realistic.",
    ],
    whatHappensWhenLaunched: executionMechanism.operatorActionSummary,
    operationalDependencies,
    executionMechanism,
    executionMode: "hybrid_manual_ready_for_automation",
    automationEligibility: "automation_possible_with_integration",
  };
}