export type CommercialOwnerObjective =
  | "ACCOUNT_ACQUISITION"
  | "NAMED_ACCOUNT_PURSUIT"
  | "INCUMBENT_DISPLACEMENT"
  | "RECURRING_CONTRACT_GROWTH"
  | "MAINTENANCE_AGREEMENT_GROWTH"
  | "ACCOUNT_EXPANSION"
  | "COMMERCIAL_REACTIVATION"
  | "VENDOR_RELATIONSHIP_DEVELOPMENT"
  | "GENERAL_COMMERCIAL_GROWTH";

export type CommercialAccountType =
  | "PROPERTY_MANAGEMENT_COMPANY"
  | "APARTMENT_COMMUNITY"
  | "HOA"
  | "FACILITY_MANAGEMENT"
  | "HOTEL_HOSPITALITY"
  | "HEALTHCARE_FACILITY"
  | "EDUCATION"
  | "COMMERCIAL_PROPERTY_OWNER"
  | "MULTI_SITE_BUSINESS"
  | "RETAIL"
  | "INDUSTRIAL"
  | "GOVERNMENT"
  | "GENERAL_COMMERCIAL"
  | "NAMED_ORGANIZATION";

export type CommercialRelationshipState =
  | "NEW_PROSPECT"
  | "EXISTING_ACCOUNT"
  | "PAST_ACCOUNT"
  | "INCUMBENT_PRESENT"
  | "UNKNOWN";

export type CommercialRelationshipGoal =
  | "INTRODUCTION"
  | "APPROVED_VENDOR"
  | "BACKUP_VENDOR"
  | "PROJECT_AWARD"
  | "MAINTENANCE_AGREEMENT"
  | "RECURRING_SERVICE_RELATIONSHIP"
  | "ACCOUNT_EXPANSION"
  | "INCUMBENT_REPLACEMENT";

export type CommercialRevenueModel =
  | "ONE_TIME_PROJECT"
  | "RECURRING_SERVICE"
  | "MAINTENANCE_AGREEMENT"
  | "VENDOR_RELATIONSHIP"
  | "ACCOUNT_EXPANSION"
  | "RECURRING_AND_PROJECT_WORK"
  | "UNKNOWN";

export type CommercialBuyingStage =
  | "RESEARCH"
  | "INTRODUCTION"
  | "QUALIFICATION"
  | "WALKTHROUGH"
  | "PROPOSAL"
  | "VENDOR_REVIEW"
  | "NEGOTIATION"
  | "UNKNOWN";

export type CommercialIntentConfidence =
  | "HIGH"
  | "MEDIUM"
  | "DEFAULT";

export type InterpretedCommercialIntent = {
  market: "COMMERCIAL";

  ownerObjective: CommercialOwnerObjective;
  confidence: CommercialIntentConfidence;
  matchedSignals: string[];

  targetAccountName: string | null;
  targetAccountType: CommercialAccountType;
  namedIncumbent: string | null;
  targetService: string | null;

  relationshipState: CommercialRelationshipState;
  relationshipGoal: CommercialRelationshipGoal;
  revenueModel: CommercialRevenueModel;
  buyingStage: CommercialBuyingStage;

  requestedTimeframe: string | null;

  ownerProvidedFacts: string[];
  assumptions: string[];
  unknowns: string[];
};

export type CommercialPursuitPhase =
  | "ACCOUNT_RESEARCH"
  | "INITIAL_OUTREACH"
  | "QUALIFICATION"
  | "DISCOVERY"
  | "WALKTHROUGH"
  | "VENDOR_READINESS"
  | "PROPOSAL"
  | "FOLLOW_UP"
  | "NEGOTIATION"
  | "ONBOARDING";

export type CommercialPursuitStep = {
  phase: CommercialPursuitPhase;
  sequence: number;
  title: string;
  objective: string;
  ownerAction: string;
  marketForgeDeliverable: string;
  completionSignal: string;
};

export type CommercialStakeholder = {
  role: string;
  influence: "DECISION_MAKER" | "INFLUENCER" | "GATEKEEPER" | "USER";
  likelyPriority: string;
  engagementGoal: string;
};

export type CommercialPositioningPillar = {
  title: string;
  message: string;
  proofNeeded: string[];
};

export type CommercialRisk = {
  risk: string;
  mitigation: string;
};

export type CommercialOwnerInputRequirement = {
  key: string;
  label: string;
  reason: string;

  requiredBefore:
    | "INITIAL_OUTREACH"
    | "DISCOVERY"
    | "PROPOSAL"
    | "CONTRACT"
    | "ONBOARDING";

  valueType:
    | "TEXT"
    | "NUMBER"
    | "CURRENCY"
    | "DATE"
    | "BOOLEAN"
    | "DOCUMENT"
    | "LIST";

  currentValue: string | null;
  example: string;
};

export type CommercialPursuitStrategy = {
  strategyVersion: "commercial-v1";

  actionName: string;
  executiveSummary: string;

  primaryObjective: CommercialOwnerObjective;
  targetDescription: string;
  desiredCommercialOutcome: string;

  pursuitThesis: string;
  entryStrategy: string;
  differentiationStrategy: string;
  incumbentStrategy: string | null;

  recommendedLaunchMode:
    | "DIRECT_OUTREACH"
    | "PHONE_AND_EMAIL"
    | "IN_PERSON_VISIT"
    | "PROPOSAL_SUBMISSION"
    | "MULTI_STEP_PURSUIT";

  accountResearchPriorities: string[];
  likelyStakeholders: CommercialStakeholder[];
  positioningPillars: CommercialPositioningPillar[];

  pursuitSteps: CommercialPursuitStep[];

  discoveryObjectives: string[];
  qualificationCriteria: string[];
  proposalPriorities: string[];
  objectionThemes: string[];

  risks: CommercialRisk[];

  ownerInputRequirements: CommercialOwnerInputRequirement[];

  readyNow: string[];
  readyAfterOwnerCompletion: string[];
  readyAfterAccountDiscovery: string[];

  successSignals: string[];
  assumptions: string[];
};

export type CommercialActionType =
  | "COMMERCIAL_ACCOUNT_PURSUIT"
  | "COMMERCIAL_ACCOUNT_EXPANSION"
  | "COMMERCIAL_REACTIVATION"
  | "COMMERCIAL_VENDOR_PURSUIT"
  | "COMMERCIAL_MAINTENANCE_GROWTH"
  | "COMMERCIAL_INCUMBENT_DISPLACEMENT";

export type CommercialExecutionPhase =
  | "PREPARE"
  | "OUTREACH"
  | "QUALIFY"
  | "DISCOVER"
  | "ASSESS"
  | "PROPOSE"
  | "FOLLOW_UP"
  | "NEGOTIATE"
  | "ONBOARD";

export type CommercialExecutionTask = {
  id: string;
  sequence: number;

  phase: CommercialExecutionPhase;

  title: string;
  description: string;

  ownerAction: string;
  marketForgeSupport: string;

  completionSignal: string;

  blockedByOwnerInputKeys: string[];
};

export type CommercialActionReadiness = {
  readyNow: string[];
  readyAfterOwnerCompletion: string[];
  readyAfterAccountDiscovery: string[];

  blockingOwnerInputKeys: string[];
  proposalInputKeys: string[];
  onboardingInputKeys: string[];
};

export type CommercialActionTarget = {
  accountName: string | null;
  accountType: CommercialAccountType;
  displayLabel: string;

  namedIncumbent: string | null;
  relationshipState: CommercialRelationshipState;
  relationshipGoal: CommercialRelationshipGoal;
};

export type CommercialActionSpec = {
  specVersion: "commercial-action-v1";
  market: "COMMERCIAL";
  origin: "nl_custom";

  actionType: CommercialActionType;

  actionName: string;
  actionSummary: string;

  ownerPrompt: string;
  ownerObjective: CommercialOwnerObjective;

  target: CommercialActionTarget;

  targetService: string | null;
  revenueModel: CommercialRevenueModel;

  launchMode:
    | "DIRECT_OUTREACH"
    | "PHONE_AND_EMAIL"
    | "IN_PERSON_VISIT"
    | "PROPOSAL_SUBMISSION"
    | "MULTI_STEP_PURSUIT";

  primaryCallToAction: string;

  expectedOutcome: string;
  pursuitThesis: string;

  executionTasks: CommercialExecutionTask[];

  ownerInputRequirements: CommercialOwnerInputRequirement[];

  readiness: CommercialActionReadiness;

  assumptions: string[];
  risks: CommercialRisk[];

  successSignals: string[];

  metadata: {
    intentConfidence: CommercialIntentConfidence;
    matchedSignals: string[];
    strategyVersion: "commercial-v1";
    generatedAt: string;
  };
};

export type CommercialAssetCategory =
  | "ACCOUNT_BRIEF"
  | "CAPABILITY_STATEMENT"
  | "INITIAL_OUTREACH"
  | "PHONE_SCRIPT"
  | "VOICEMAIL"
  | "DIRECT_MESSAGE"
  | "OFFICE_VISIT"
  | "QUALIFICATION"
  | "DISCOVERY"
  | "WALKTHROUGH"
  | "VENDOR_READINESS"
  | "PROPOSAL"
  | "MAINTENANCE_AGREEMENT"
  | "OBJECTION_HANDLING"
  | "FOLLOW_UP"
  | "NEGOTIATION"
  | "ONBOARDING";

export type CommercialAssetReadiness =
  | "READY_NOW"
  | "OWNER_INPUT_REQUIRED"
  | "ACCOUNT_DISCOVERY_REQUIRED";

export type CommercialAssetSection = {
  heading: string;
  content: string;
};

export type CommercialPursuitAsset = {
  id: string;

  category: CommercialAssetCategory;

  title: string;

  purpose: string;

  readiness: CommercialAssetReadiness;

  requiredOwnerInputKeys: string[];

  requiredAccountDiscoveryItems: string[];

  sections: CommercialAssetSection[];

  usageInstructions: string;

  completionSignal: string;
};

export type CommercialPursuitAssetPackage = {
  packageVersion: "commercial-assets-v1";

  market: "COMMERCIAL";

  actionName: string;

  ownerObjective: CommercialOwnerObjective;

  targetLabel: string;

  executiveSummary: string;

  assets: CommercialPursuitAsset[];

  readyNowAssetIds: string[];

  ownerInputRequiredAssetIds: string[];

  accountDiscoveryRequiredAssetIds: string[];

  ownerInputRequirements: CommercialOwnerInputRequirement[];

  unresolvedAccountDiscoveryItems: string[];

  assumptions: string[];

  generatedAt: string;
};

export type CommercialBusinessContext = {
  businessName: string;
  website: string | null;
  phone: string | null;

  city: string | null;
  state: string | null;
  serviceArea: string;

  industryLabel: string | null;

  verifiedServices: string[];

  logoUrl: string | null;
};

export type CommercialOwnerInputValueMap =
  Record<string, string>;