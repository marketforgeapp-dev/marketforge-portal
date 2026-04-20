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

export type ActionTargetingMode = "efficient" | "balanced" | "aggressive";
export type ActionIntentLevel = "high" | "medium" | "low";
export type ActionJobValueTier = "low" | "medium" | "high";
export type ActionServiceDemandType =
  | "emergency"
  | "install"
  | "maintenance"
  | "review"
  | "reactivation"
  | "visibility"
  | "general";

export type ActionTargeting = {
  mode: ActionTargetingMode;
  base: {
    geography: {
      type: "service_area";
      value: string[];
    };
    service: {
      primary: string;
      demandType: ActionServiceDemandType;
    };
    businessType: "local_service_business";
    constraints: string[];
  };
  intent: {
    level: ActionIntentLevel;
    purchaseUrgency: number;
    conversionLikelihood: number;
    rationale: string;
  };
  economics: {
    jobValueTier: ActionJobValueTier;
    estimatedTicket: number | null;
    rationale: string;
  };
  wasteControls: {
    excludeLowIntent: boolean;
    excludeDIY: boolean;
    excludeRenters: boolean;
    negativeKeywordThemes: string[];
    notes: string[];
  };
  platforms: {
    googleAds: {
      locationTargets: string[];
      keywordThemes: string[];
      negativeKeywordThemes: string[];
      audienceObservationHints: string[];
      biddingFocus: string;
      notes: string[];
    };
    meta: {
      locationTargets: string[];
      ageRange: [number, number] | null;
      homeownerFocus: boolean;
      interestThemes: string[];
      exclusions: string[];
      notes: string[];
    };
    googleBusinessProfile: {
      locationTargets: string[];
      localIntentFocus: string;
      primaryServiceFocus: string;
      postAngle: string;
      visibilityGoal: string;
      notes: string[];
    };
  };
  summary: {
    audienceDescription: string;
    rationale: string;
    notes: string[];
  };
  execution: {
    googleAds: string[];
    meta: string[];
    googleBusinessProfile: string[];
  };
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
  targeting: ActionTargeting;
};

function normalizeText(value?: string | null) {
  return (value ?? "").trim();
}

function normalizeLower(value?: string | null) {
  return normalizeText(value).toLowerCase();
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => normalizeText(value))
        .filter((value): value is string => Boolean(value))
    )
  );
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

function inferBusinessGoal(
  constructType: ActionConstructType
): ActionBusinessGoal {
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
          audienceRationale:
            "This audience is appropriate because review actions should be sent only to real recent customers.",
          audienceSourceType: "recent_customers",
        };
      case "REACTIVATION":
        return {
          targetAudience: explicitAudience,
          audienceRationale:
            "This audience is appropriate because reactivation actions should target existing customer relationships or known past demand.",
          audienceSourceType: "past_customers",
        };
      case "AEO_SEO_VISIBILITY":
        return {
          targetAudience: explicitAudience,
          audienceRationale:
            "This audience is appropriate because visibility work is aimed at discovery and comparison, not only immediate booking.",
          audienceSourceType: "broad_local_visibility",
        };
      default:
        return {
          targetAudience: explicitAudience,
          audienceRationale:
            "This audience is the intended commercial target for the action being launched.",
          audienceSourceType: "prospective_local_homeowners",
        };
    }
  }

  switch (params.constructType) {
    case "REVIEW_ACQUISITION":
      return {
        targetAudience: `Recent completed-job customers in ${area} who have not yet left a review`,
        audienceRationale:
          "This audience has already experienced the service, so a review request is credible and operationally appropriate.",
        audienceSourceType: "recent_customers",
      };

    case "REACTIVATION":
      return {
        targetAudience: `Past customers in ${area} who may be due for ${service.toLowerCase()} again`,
        audienceRationale:
          "This audience is more likely to respond because they already know the business and may reasonably need follow-up service.",
        audienceSourceType: "past_customers",
      };

    case "AEO_SEO_VISIBILITY":
      return {
        targetAudience: `Homeowners in ${area} searching for ${service.toLowerCase()} information and trusted local providers`,
        audienceRationale:
          "This audience matches visibility and discovery work rather than direct paid conversion only.",
        audienceSourceType: "broad_local_visibility",
      };

    case "CAPACITY_FILL":
      return {
        targetAudience: `Homeowners in ${area} with service needs that are easier to book this week`,
        audienceRationale:
          "This audience is best suited to lower-friction booking and schedule-fill actions.",
        audienceSourceType: "prospective_local_homeowners",
      };

    case "OFFER_PROMOTION":
      return {
        targetAudience: `Homeowners in ${area} actively considering ${service.toLowerCase()} and likely to respond to a clear offer`,
        audienceRationale:
          "This audience is closest to taking action when a real offer reduces friction or increases urgency.",
        audienceSourceType: "prospective_local_homeowners",
      };

    case "POSITIONING":
      return {
        targetAudience: `Homeowners in ${area} comparing providers for ${service.toLowerCase()} and looking for a trusted choice`,
        audienceRationale:
          "This audience is most likely to respond to stronger proof, differentiation, and credibility signals.",
        audienceSourceType: "prospective_local_homeowners",
      };

    case "DEMAND_CAPTURE":
    default:
      return {
        targetAudience: `Homeowners in ${area} who need ${service.toLowerCase()}`,
        audienceRationale:
          "This audience is the most commercially relevant group for near-term service demand.",
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
      offerFulfillmentNotes:
        "Confirm the business can honor this percentage discount before launch.",
    };
  }

  if (lower.includes("$")) {
    return {
      offerType: "fixed_discount",
      offerLabel: rawOffer,
      offerValue: rawOffer,
      offerDuration: null,
      offerConditions: null,
      offerFulfillmentNotes:
        "Confirm the business can honor this fixed discount before launch.",
    };
  }

  if (lower.includes("financing")) {
    return {
      offerType: "financing",
      offerLabel: rawOffer,
      offerValue: rawOffer,
      offerDuration: null,
      offerConditions: null,
      offerFulfillmentNotes:
        "Confirm financing terms are real and currently available before launch.",
    };
  }

  if (lower.includes("priority")) {
    return {
      offerType: "priority_scheduling",
      offerLabel: rawOffer,
      offerValue: rawOffer,
      offerDuration: null,
      offerConditions: null,
      offerFulfillmentNotes:
        "Confirm the team can operationally honor priority scheduling before launch.",
    };
  }

  if (lower.includes("bundle")) {
    return {
      offerType: "bundle",
      offerLabel: rawOffer,
      offerValue: rawOffer,
      offerDuration: null,
      offerConditions: null,
      offerFulfillmentNotes:
        "Confirm the included services and bundle delivery before launch.",
    };
  }

  if (lower.includes("free")) {
    return {
      offerType: "free_add_on",
      offerLabel: rawOffer,
      offerValue: rawOffer,
      offerDuration: null,
      offerConditions: null,
      offerFulfillmentNotes:
        "Confirm the business can honor this free add-on before launch.",
    };
  }

  if (lower.includes("warranty") || lower.includes("guarantee")) {
    return {
      offerType: "warranty",
      offerLabel: rawOffer,
      offerValue: rawOffer,
      offerDuration: null,
      offerConditions: null,
      offerFulfillmentNotes:
        "Confirm warranty or guarantee terms are real and currently available before launch.",
    };
  }

  return {
    offerType:
      params.constructType === "OFFER_PROMOTION" ? "inspection_offer" : "none",
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
        operatorActionSummary:
          "Send the approved review request workflow to recent completed-job customers.",
        requiredAssets: [
          "review request copy",
          "follow-up copy",
          "optional QR leave-behind",
        ],
        requiredAccess: ["customer contact list"],
        manualSteps: [
          "Identify recent completed-job customers.",
          "Send the approved review request copy.",
          "Optionally use QR leave-behind or front-office follow-up.",
          "Stop follow-up after review is received or cadence limit is reached.",
        ],
        futureAutomationHook:
          "Trigger review request automatically after completed job status.",
      };

    case "AEO_SEO_VISIBILITY":
      return {
        channelType: "website_content",
        triggerType: "content_publish",
        deliverySurface: "website_cms",
        operatorActionSummary:
          "Publish the approved FAQ, answer, or service-page visibility content.",
        requiredAssets: ["FAQ content", "answer snippet", "SEO guidance"],
        requiredAccess: ["website or CMS access"],
        manualSteps: [
          "Open the correct page or content editor.",
          "Paste the approved content.",
          "Review formatting and service-area language.",
          "Publish the update and verify it is live.",
        ],
        futureAutomationHook:
          "Push approved structured content through CMS integration.",
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
        requiredAccess: [
          "channel account access",
          "business phone or booking destination",
        ],
        manualSteps: [
          "Open the selected channel account.",
          "Paste the approved copy and load the approved creative.",
          "Confirm CTA, service area, and booking destination.",
          "Preview and publish the asset.",
        ],
        futureAutomationHook:
          "Create and launch approved channel assets through platform integrations.",
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
    base.offer_readiness.push(
      "Offer has been approved and can be honored operationally"
    );
    base.staff_behavior.push("Team knows how to apply or honor the offer");
  }

  if (params.constructType === "REVIEW_ACQUISITION") {
    base.business_readiness.push(
      "Recent completed-job customer list is available"
    );
    base.staff_behavior.push(
      "Review request timing and cadence are understood"
    );
  }

  if (params.constructType === "AEO_SEO_VISIBILITY") {
    base.website_or_landing_readiness.push(
      "Target website page or content surface is identified"
    );
    base.website_or_landing_readiness.push("Publishing access is available");
  }

  return base;
}

function inferServiceDemandType(params: {
  constructType: ActionConstructType;
  targetService: string;
  actionSummary?: string | null;
}): ActionServiceDemandType {
  const haystack = [params.targetService, params.actionSummary]
    .map(normalizeLower)
    .join(" ");

  if (params.constructType === "REVIEW_ACQUISITION") return "review";
  if (params.constructType === "REACTIVATION") return "reactivation";
  if (params.constructType === "AEO_SEO_VISIBILITY") return "visibility";

  if (
    haystack.includes("emergency") ||
    haystack.includes("urgent") ||
    haystack.includes("same day") ||
    haystack.includes("same-day") ||
    haystack.includes("burst") ||
    haystack.includes("no heat") ||
    haystack.includes("no ac")
  ) {
    return "emergency";
  }

  if (
    haystack.includes("install") ||
    haystack.includes("replacement") ||
    haystack.includes("replace") ||
    haystack.includes("new unit") ||
    haystack.includes("upgrade")
  ) {
    return "install";
  }

  if (
    haystack.includes("maintenance") ||
    haystack.includes("tune-up") ||
    haystack.includes("tune up") ||
    haystack.includes("inspection") ||
    haystack.includes("cleaning")
  ) {
    return "maintenance";
  }

  return "general";
}

function inferIntentProfile(params: {
  constructType: ActionConstructType;
  demandType: ActionServiceDemandType;
}) {
  if (params.constructType === "REVIEW_ACQUISITION") {
    return {
      level: "low" as ActionIntentLevel,
      purchaseUrgency: 2,
      conversionLikelihood: 8,
      rationale:
        "These are real completed-job customers, so the conversion target is review completion rather than new paid demand capture.",
    };
  }

  if (params.constructType === "REACTIVATION") {
    return {
      level: "medium" as ActionIntentLevel,
      purchaseUrgency: 5,
      conversionLikelihood: 7,
      rationale:
        "Past customers already know the business, which improves response likelihood even when urgency is not immediate.",
    };
  }

  if (params.constructType === "AEO_SEO_VISIBILITY") {
    return {
      level: "medium" as ActionIntentLevel,
      purchaseUrgency: 4,
      conversionLikelihood: 5,
      rationale:
        "Visibility actions support discovery and local trust, but they are broader than direct high-intent demand capture.",
    };
  }

  switch (params.demandType) {
    case "emergency":
      return {
        level: "high" as ActionIntentLevel,
        purchaseUrgency: 10,
        conversionLikelihood: 9,
        rationale:
          "Emergency demand usually has the highest urgency and strongest near-term booking intent.",
      };
    case "install":
      return {
        level: "high" as ActionIntentLevel,
        purchaseUrgency: 8,
        conversionLikelihood: 8,
        rationale:
          "Install and replacement demand is usually high value and still strong intent when the audience is kept local and focused.",
      };
    case "maintenance":
      return {
        level: "medium" as ActionIntentLevel,
        purchaseUrgency: 5,
        conversionLikelihood: 6,
        rationale:
          "Maintenance demand converts best when the targeting is controlled and the messaging reduces friction.",
      };
    default:
      return {
        level: "high" as ActionIntentLevel,
        purchaseUrgency: 7,
        conversionLikelihood: 8,
        rationale:
          "General local service demand is still commercially strong when targeting stays local and specific to the service.",
      };
  }
}

function inferEconomics(averageJobValue?: number | null) {
  if (typeof averageJobValue !== "number" || averageJobValue <= 0) {
    return {
      jobValueTier: "medium" as ActionJobValueTier,
      estimatedTicket: null,
      rationale:
        "No average job value was stored, so this action defaults to a medium-value planning assumption.",
    };
  }

  if (averageJobValue >= 2000) {
    return {
      jobValueTier: "high" as ActionJobValueTier,
      estimatedTicket: averageJobValue,
      rationale:
        "The stored average job value indicates that tighter targeting is justified to protect spend efficiency.",
    };
  }

  if (averageJobValue >= 750) {
    return {
      jobValueTier: "medium" as ActionJobValueTier,
      estimatedTicket: averageJobValue,
      rationale:
        "The stored average job value supports a balanced but still efficiency-aware targeting approach.",
    };
  }

  return {
    jobValueTier: "low" as ActionJobValueTier,
    estimatedTicket: averageJobValue,
    rationale:
      "The stored average job value suggests tighter waste controls are important to preserve efficiency.",
  };
}

function inferTargetingMode(params: {
  constructType: ActionConstructType;
  intentLevel: ActionIntentLevel;
  jobValueTier: ActionJobValueTier;
}) {
  if (params.constructType === "AEO_SEO_VISIBILITY") {
    return "balanced" as ActionTargetingMode;
  }

  if (params.constructType === "REVIEW_ACQUISITION") {
    return "efficient" as ActionTargetingMode;
  }

  if (params.jobValueTier === "high" || params.intentLevel === "high") {
    return "efficient" as ActionTargetingMode;
  }

  return "balanced" as ActionTargetingMode;
}

function buildKeywordThemes(params: {
  targetService: string;
  demandType: ActionServiceDemandType;
}) {
  const rawService = normalizeText(params.targetService).toLowerCase();

  // Clean base service phrase
  const base = rawService
    .replace(/&/g, "and")
    .replace(/\s+/g, " ")
    .trim();

  const baseNoSuffix = base.replace(/\b(service|services)\b/g, "").trim();

  const themes: string[] = [];

  if (params.demandType === "emergency") {
  themes.push(
    `emergency ${baseNoSuffix}`,
    `${baseNoSuffix} near me`,
    `urgent ${baseNoSuffix}`,
    `same day ${baseNoSuffix}`,
    `${baseNoSuffix} cost`
  );
} else if (params.demandType === "install") {
    themes.push(
      `${baseNoSuffix} installation`,
      `${baseNoSuffix} replacement`,
      `new ${baseNoSuffix}`,
      `${baseNoSuffix} quote`
    );
  } else if (params.demandType === "maintenance") {
    themes.push(
      `${baseNoSuffix} maintenance`,
      `${baseNoSuffix} tune up`,
      `${baseNoSuffix} inspection`,
      `${baseNoSuffix} service`
    );
  } else {
  themes.push(
    `${baseNoSuffix}`,
    `${baseNoSuffix} near me`,
    `${baseNoSuffix} company`,
    `${baseNoSuffix} service`,
    `${baseNoSuffix} cost`,
    `${baseNoSuffix} quote`
  );
}

  // Remove duplicates and weird strings
  return uniqueStrings(
    themes
      .map((t) => t.replace(/\s+/g, " ").trim())
      .filter((t) => !t.includes("service service"))
  );
}

function buildNegativeKeywordThemes(params: {
  constructType: ActionConstructType;
  demandType: ActionServiceDemandType;
}) {
  const base = ["diy", "how to", "free", "jobs", "career", "salary"];

  if (params.constructType === "AEO_SEO_VISIBILITY") {
    return base;
  }

  if (params.demandType === "install") {
    return uniqueStrings([...base, "rent", "apartment", "tenant"]);
  }

  if (params.demandType === "maintenance") {
    return uniqueStrings([...base, "cheap"]);
  }

  return base;
}

function buildMetaInterests(demandType: ActionServiceDemandType) {
  if (demandType === "install" || demandType === "maintenance") {
    return ["Home improvement", "Homeowners", "Property maintenance"];
  }

  return [];
}

function buildTargeting(params: {
  constructType: ActionConstructType;
  targetService: string;
  serviceArea: string;
  targetAudience: string;
  audienceRationale: string;
  audienceSourceType: AudienceSourceType;
  actionSummary?: string | null;
  averageJobValue?: number | null;
}): ActionTargeting {
  const serviceArea = normalizeText(params.serviceArea) || "the service area";
  const service = normalizeText(params.targetService) || "Local service";
  const demandType = inferServiceDemandType({
    constructType: params.constructType,
    targetService: params.targetService,
    actionSummary: params.actionSummary,
  });

  const intent = inferIntentProfile({
    constructType: params.constructType,
    demandType,
  });

  const economics = inferEconomics(params.averageJobValue);
  const mode = inferTargetingMode({
    constructType: params.constructType,
    intentLevel: intent.level,
    jobValueTier: economics.jobValueTier,
  });

  const negativeKeywordThemes = buildNegativeKeywordThemes({
    constructType: params.constructType,
    demandType,
  });

  const excludeRenters =
    demandType === "install" || economics.jobValueTier === "high";

  const googleKeywordThemes = buildKeywordThemes({
    targetService: service,
    demandType,
  });

    const metaAgeRange: [number, number] | null =
    demandType === "install" || demandType === "maintenance"
      ? [30, 65]
      : null;

  const metaInterests = buildMetaInterests(demandType);

  const googleAdsNotes = [
    "Keep location targeting limited to the real service area.",
    "Use the keyword themes as tightly scoped ad-group direction, not as a broad expansion list.",
    "Do not loosen intent with generic research or education-heavy traffic.",
  ];

  const metaNotes =
    metaInterests.length > 0
      ? [
          "Use the service area only.",
          "Keep targeting broad enough for delivery, but use homeowner-oriented filters where they support the service.",
          "Do not over-narrow with too many layered interests.",
        ]
      : [
          "Use the service area only.",
          "Go broader on Meta and let the creative plus geography do most of the qualification work.",
          "Do not force weak interest targeting for emergency or urgent demand.",
        ];

  const gbpNotes = [
    "Keep the post local and service-specific.",
    "Use service-area language naturally inside the copy.",
    "Match the CTA to the actual booking or phone destination.",
  ];

  return {
    mode,
    base: {
      geography: {
        type: "service_area",
        value: [serviceArea],
      },
      service: {
        primary: service,
        demandType,
      },
      businessType: "local_service_business",
      constraints: [
        "Do not target outside the real service area.",
        "Keep the targeting aligned to the selected action only.",
      ],
    },
    intent,
    economics,
    wasteControls: {
      excludeLowIntent: true,
      excludeDIY: true,
      excludeRenters,
      negativeKeywordThemes,
      notes: [
        "Prioritize conversion intent over broad reach.",
        "Suppress DIY, research, and job-seeker traffic.",
        ...(excludeRenters
          ? ["Exclude renters or tenant-oriented audiences when the service is install-heavy or high-ticket."]
          : []),
      ],
    },
    platforms: {
      googleAds: {
        locationTargets: [serviceArea],
        keywordThemes: googleKeywordThemes,
        negativeKeywordThemes,
        audienceObservationHints:
          demandType === "install"
            ? ["In-market home improvement audiences can be added in observation only."]
            : ["Use audience observation only if it does not weaken local intent."],
        biddingFocus:
          intent.level === "high"
            ? "Focus on high-intent local conversion traffic."
            : "Focus on efficient local conversion traffic without broadening intent.",
        notes: googleAdsNotes,
      },
      meta: {
        locationTargets: [serviceArea],
        ageRange: metaAgeRange,
        homeownerFocus: params.audienceSourceType === "prospective_local_homeowners",
        interestThemes: metaInterests,
        exclusions: uniqueStrings([
          excludeRenters ? "Renters" : "",
          "Low-intent broad interest stacking",
        ]),
        notes: metaNotes,
      },
      googleBusinessProfile: {
        locationTargets: [serviceArea],
        localIntentFocus: `People in ${serviceArea} looking for a trusted local provider for ${service.toLowerCase()}.`,
        primaryServiceFocus: service,
        postAngle:
          demandType === "emergency"
            ? "Urgency, availability, and fast response."
            : demandType === "install"
              ? "Trust, credibility, and decision confidence."
              : demandType === "maintenance"
                ? "Proactive service, convenience, and low-friction booking."
                : "Local relevance, trust, and service clarity.",
        visibilityGoal:
          params.constructType === "AEO_SEO_VISIBILITY"
            ? "Strengthen local discovery and trust signals."
            : "Support local action from nearby searchers and profile visitors.",
        notes: gbpNotes,
      },
    },
    summary: {
      audienceDescription: params.targetAudience,
      rationale: `${
  intent.level === "high"
    ? "This targeting is built to capture high-intent local demand"
    : intent.level === "medium"
      ? "This targeting is designed to capture commercially relevant local demand"
      : "This targeting focuses on a narrower, lower-intent audience"
} for ${service.toLowerCase()} in ${serviceArea}. ${
  demandType === "emergency"
    ? "Emergency demand is prioritized because urgency and conversion likelihood are highest."
    : demandType === "install"
      ? "Because these jobs are higher value, targeting is kept tight to protect spend efficiency."
      : demandType === "maintenance"
        ? "Targeting stays controlled to maintain efficiency without drifting too broad."
        : "The focus stays on people most likely to book service rather than broad awareness traffic."
} Waste controls reduce DIY, job-seeker, and other low-intent traffic.`,
      notes: [
        intent.rationale,
        economics.rationale,
        "This targeting is attached after action selection and does not influence action ranking.",
      ],
    },
    execution: {
      googleAds: [
        `Set campaign location targeting to ${serviceArea}.`,
        "Use the keyword themes to create tightly aligned ad groups.",
        "Add the negative keyword themes before publishing.",
        "Do not expand beyond the service area or into broad research traffic.",
      ],
      meta: [
        `Set the location to ${serviceArea}.`,
        ...(metaAgeRange
          ? [`Set age range to ${metaAgeRange[0]}-${metaAgeRange[1]}.`]
          : ["Leave age range broad unless platform policy or business context requires otherwise."]),
        ...(metaInterests.length > 0
          ? [`Add interests: ${metaInterests.join(", ")}.`]
          : ["Do not add weak interest layers that reduce delivery quality."]),
        ...(excludeRenters ? ["Exclude renters or tenant-oriented audiences."] : []),
      ],
      googleBusinessProfile: [
        `Keep the post explicitly tied to ${serviceArea}.`,
        `Make ${service.toLowerCase()} the primary service focus in the post.`,
        "Use the approved post angle and CTA without adding extra claims.",
        "Match the destination URL or phone CTA to the approved action.",
      ],
    },
  };
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
  averageJobValue?: number | null;
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

  const targeting = buildTargeting({
    constructType,
    targetService: params.targetService,
    serviceArea: params.serviceArea,
    targetAudience: audience.targetAudience,
    audienceRationale: audience.audienceRationale,
    audienceSourceType: audience.audienceSourceType,
    actionSummary: params.actionSummary,
    averageJobValue: params.averageJobValue,
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
    targeting,
  };
}