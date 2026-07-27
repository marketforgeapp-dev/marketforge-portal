import { z } from "zod";

export const commercialOwnerObjectiveSchema = z.enum([
  "ACCOUNT_ACQUISITION",
  "NAMED_ACCOUNT_PURSUIT",
  "INCUMBENT_DISPLACEMENT",
  "RECURRING_CONTRACT_GROWTH",
  "MAINTENANCE_AGREEMENT_GROWTH",
  "ACCOUNT_EXPANSION",
  "COMMERCIAL_REACTIVATION",
  "VENDOR_RELATIONSHIP_DEVELOPMENT",
  "GENERAL_COMMERCIAL_GROWTH",
]);

export const commercialAccountTypeSchema = z.enum([
  "PROPERTY_MANAGEMENT_COMPANY",
  "APARTMENT_COMMUNITY",
  "HOA",
  "FACILITY_MANAGEMENT",
  "HOTEL_HOSPITALITY",
  "HEALTHCARE_FACILITY",
  "EDUCATION",
  "COMMERCIAL_PROPERTY_OWNER",
  "MULTI_SITE_BUSINESS",
  "RETAIL",
  "INDUSTRIAL",
  "GOVERNMENT",
  "GENERAL_COMMERCIAL",
  "NAMED_ORGANIZATION",
]);

export const interpretedCommercialIntentSchema = z.object({
  market: z.literal("COMMERCIAL"),

  ownerObjective: commercialOwnerObjectiveSchema,

  confidence: z.enum([
    "HIGH",
    "MEDIUM",
    "DEFAULT",
  ]),

  matchedSignals: z.array(z.string()),

  targetAccountName: z.string().nullable(),

  targetAccountType: commercialAccountTypeSchema,

  namedIncumbent: z.string().nullable(),

  targetService: z.string().nullable(),

  relationshipState: z.enum([
    "NEW_PROSPECT",
    "EXISTING_ACCOUNT",
    "PAST_ACCOUNT",
    "INCUMBENT_PRESENT",
    "UNKNOWN",
  ]),

  relationshipGoal: z.enum([
    "INTRODUCTION",
    "APPROVED_VENDOR",
    "BACKUP_VENDOR",
    "PROJECT_AWARD",
    "MAINTENANCE_AGREEMENT",
    "RECURRING_SERVICE_RELATIONSHIP",
    "ACCOUNT_EXPANSION",
    "INCUMBENT_REPLACEMENT",
  ]),

  revenueModel: z.enum([
    "ONE_TIME_PROJECT",
    "RECURRING_SERVICE",
    "MAINTENANCE_AGREEMENT",
    "VENDOR_RELATIONSHIP",
    "ACCOUNT_EXPANSION",
    "RECURRING_AND_PROJECT_WORK",
    "UNKNOWN",
  ]),

  buyingStage: z.enum([
    "RESEARCH",
    "INTRODUCTION",
    "QUALIFICATION",
    "WALKTHROUGH",
    "PROPOSAL",
    "VENDOR_REVIEW",
    "NEGOTIATION",
    "UNKNOWN",
  ]),

  requestedTimeframe: z.string().nullable(),

  ownerProvidedFacts: z.array(z.string()),

  assumptions: z.array(z.string()),

  unknowns: z.array(z.string()),
});

export const commercialPursuitPhaseSchema = z.enum([
  "ACCOUNT_RESEARCH",
  "INITIAL_OUTREACH",
  "QUALIFICATION",
  "DISCOVERY",
  "WALKTHROUGH",
  "VENDOR_READINESS",
  "PROPOSAL",
  "FOLLOW_UP",
  "NEGOTIATION",
  "ONBOARDING",
]);

export const commercialPursuitStepSchema = z.object({
  phase: commercialPursuitPhaseSchema,

  sequence: z.number().int().positive(),

  title: z.string().min(3),

  objective: z.string().min(10),

  ownerAction: z.string().min(5),

  marketForgeDeliverable: z.string().min(5),

  completionSignal: z.string().min(5),
});

export const commercialStakeholderSchema = z.object({
  role: z.string().min(2),

  influence: z.enum([
    "DECISION_MAKER",
    "INFLUENCER",
    "GATEKEEPER",
    "USER",
  ]),

  likelyPriority: z.string().min(5),

  engagementGoal: z.string().min(5),
});

export const commercialPositioningPillarSchema = z.object({
  title: z.string().min(2),

  message: z.string().min(10),

  proofNeeded: z.array(z.string()),
});

export const commercialRiskSchema = z.object({
  risk: z.string().min(5),

  mitigation: z.string().min(5),
});

export const commercialOwnerInputRequirementSchema = z.object({
  key: z.string().min(2),

  label: z.string().min(2),

  reason: z.string().min(5),

  requiredBefore: z.enum([
    "INITIAL_OUTREACH",
    "DISCOVERY",
    "PROPOSAL",
    "CONTRACT",
    "ONBOARDING",
  ]),

  valueType: z.enum([
    "TEXT",
    "NUMBER",
    "CURRENCY",
    "DATE",
    "BOOLEAN",
    "DOCUMENT",
    "LIST",
  ]),

  currentValue: z.string().nullable(),

  example: z.string().min(2),
});

export const commercialPursuitStrategySchema = z.object({
  strategyVersion: z.literal("commercial-v1"),

  actionName: z.string().min(5),

  executiveSummary: z.string().min(20),

  primaryObjective: commercialOwnerObjectiveSchema,

  targetDescription: z.string().min(3),

  desiredCommercialOutcome: z.string().min(10),

  pursuitThesis: z.string().min(20),

  entryStrategy: z.string().min(20),

  differentiationStrategy: z.string().min(20),

  incumbentStrategy: z.string().nullable(),

  recommendedLaunchMode: z.enum([
    "DIRECT_OUTREACH",
    "PHONE_AND_EMAIL",
    "IN_PERSON_VISIT",
    "PROPOSAL_SUBMISSION",
    "MULTI_STEP_PURSUIT",
  ]),

  accountResearchPriorities: z.array(z.string()).min(3),

  likelyStakeholders: z
    .array(commercialStakeholderSchema)
    .min(2),

  positioningPillars: z
    .array(commercialPositioningPillarSchema)
    .min(2),

  pursuitSteps: z
    .array(commercialPursuitStepSchema)
    .min(6),

  discoveryObjectives: z.array(z.string()).min(3),

  qualificationCriteria: z.array(z.string()).min(3),

  proposalPriorities: z.array(z.string()).min(3),

  objectionThemes: z.array(z.string()).min(3),

  risks: z.array(commercialRiskSchema).min(2),

  ownerInputRequirements: z.array(
    commercialOwnerInputRequirementSchema
  ),

  readyNow: z.array(z.string()),

  readyAfterOwnerCompletion: z.array(z.string()),

  readyAfterAccountDiscovery: z.array(z.string()),

  successSignals: z.array(z.string()).min(3),

  assumptions: z.array(z.string()),
});

export type InterpretedCommercialIntentSchema =
  z.infer<typeof interpretedCommercialIntentSchema>;

export type CommercialPursuitStrategySchema =
  z.infer<typeof commercialPursuitStrategySchema>;

export const commercialActionTypeSchema = z.enum([
  "COMMERCIAL_ACCOUNT_PURSUIT",
  "COMMERCIAL_ACCOUNT_EXPANSION",
  "COMMERCIAL_REACTIVATION",
  "COMMERCIAL_VENDOR_PURSUIT",
  "COMMERCIAL_MAINTENANCE_GROWTH",
  "COMMERCIAL_INCUMBENT_DISPLACEMENT",
]);

export const commercialExecutionPhaseSchema = z.enum([
  "PREPARE",
  "OUTREACH",
  "QUALIFY",
  "DISCOVER",
  "ASSESS",
  "PROPOSE",
  "FOLLOW_UP",
  "NEGOTIATE",
  "ONBOARD",
]);

export const commercialExecutionTaskSchema = z.object({
  id: z.string().min(3),

  sequence: z.number().int().positive(),

  phase: commercialExecutionPhaseSchema,

  title: z.string().min(3),

  description: z.string().min(10),

  ownerAction: z.string().min(5),

  marketForgeSupport: z.string().min(5),

  completionSignal: z.string().min(5),

  blockedByOwnerInputKeys: z.array(
    z.string()
  ),
});

export const commercialActionReadinessSchema = z.object({
  readyNow: z.array(z.string()),

  readyAfterOwnerCompletion: z.array(
    z.string()
  ),

  readyAfterAccountDiscovery: z.array(
    z.string()
  ),

  blockingOwnerInputKeys: z.array(
    z.string()
  ),

  proposalInputKeys: z.array(
    z.string()
  ),

  onboardingInputKeys: z.array(
    z.string()
  ),
});

export const commercialActionTargetSchema = z.object({
  accountName: z.string().nullable(),

  accountType:
    commercialAccountTypeSchema,

  displayLabel: z.string().min(2),

  namedIncumbent: z.string().nullable(),

  relationshipState: z.enum([
    "NEW_PROSPECT",
    "EXISTING_ACCOUNT",
    "PAST_ACCOUNT",
    "INCUMBENT_PRESENT",
    "UNKNOWN",
  ]),

  relationshipGoal: z.enum([
    "INTRODUCTION",
    "APPROVED_VENDOR",
    "BACKUP_VENDOR",
    "PROJECT_AWARD",
    "MAINTENANCE_AGREEMENT",
    "RECURRING_SERVICE_RELATIONSHIP",
    "ACCOUNT_EXPANSION",
    "INCUMBENT_REPLACEMENT",
  ]),
});

export const commercialActionSpecSchema = z.object({
  specVersion: z.literal(
    "commercial-action-v1"
  ),

  market: z.literal("COMMERCIAL"),

  origin: z.literal("nl_custom"),

  actionType:
    commercialActionTypeSchema,

  actionName: z.string().min(5),

  actionSummary: z.string().min(20),

  ownerPrompt: z.string().min(5),

  ownerObjective:
    commercialOwnerObjectiveSchema,

  target:
    commercialActionTargetSchema,

  targetService: z.string().nullable(),

  revenueModel: z.enum([
    "ONE_TIME_PROJECT",
    "RECURRING_SERVICE",
    "MAINTENANCE_AGREEMENT",
    "VENDOR_RELATIONSHIP",
    "ACCOUNT_EXPANSION",
    "RECURRING_AND_PROJECT_WORK",
    "UNKNOWN",
  ]),

  launchMode: z.enum([
    "DIRECT_OUTREACH",
    "PHONE_AND_EMAIL",
    "IN_PERSON_VISIT",
    "PROPOSAL_SUBMISSION",
    "MULTI_STEP_PURSUIT",
  ]),

  primaryCallToAction: z.string().min(5),

  expectedOutcome: z.string().min(10),

  pursuitThesis: z.string().min(20),

  executionTasks: z
    .array(
      commercialExecutionTaskSchema
    )
    .min(5),

  ownerInputRequirements: z.array(
    commercialOwnerInputRequirementSchema
  ),

  readiness:
    commercialActionReadinessSchema,

  assumptions: z.array(z.string()),

  risks: z.array(
    commercialRiskSchema
  ),

  successSignals: z
    .array(z.string())
    .min(2),

  metadata: z.object({
    intentConfidence: z.enum([
      "HIGH",
      "MEDIUM",
      "DEFAULT",
    ]),

    matchedSignals: z.array(
      z.string()
    ),

    strategyVersion: z.literal(
      "commercial-v1"
    ),

    generatedAt: z.string().datetime(),
  }),
});

export type CommercialActionSpecSchema =
  z.infer<
    typeof commercialActionSpecSchema
  >;

export const commercialAssetCategorySchema = z.enum([
  "ACCOUNT_BRIEF",
  "CAPABILITY_STATEMENT",
  "INITIAL_OUTREACH",
  "PHONE_SCRIPT",
  "VOICEMAIL",
  "DIRECT_MESSAGE",
  "OFFICE_VISIT",
  "QUALIFICATION",
  "DISCOVERY",
  "WALKTHROUGH",
  "VENDOR_READINESS",
  "PROPOSAL",
  "MAINTENANCE_AGREEMENT",
  "OBJECTION_HANDLING",
  "FOLLOW_UP",
  "NEGOTIATION",
  "ONBOARDING",
]);

export const commercialAssetReadinessSchema = z.enum([
  "READY_NOW",
  "OWNER_INPUT_REQUIRED",
  "ACCOUNT_DISCOVERY_REQUIRED",
]);

export const commercialAssetSectionSchema = z.object({
  heading: z.string().min(2),

  content: z.string().min(5),
});

export const commercialPursuitAssetSchema = z.object({
  id: z.string().min(3),

  category: commercialAssetCategorySchema,

  title: z.string().min(3),

  purpose: z.string().min(10),

  readiness: commercialAssetReadinessSchema,

  requiredOwnerInputKeys: z.array(
    z.string()
  ),

  requiredAccountDiscoveryItems: z.array(
    z.string()
  ),

  sections: z
    .array(
      commercialAssetSectionSchema
    )
    .min(1),

  usageInstructions: z.string().min(10),

  completionSignal: z.string().min(5),
});

export const commercialPursuitAssetPackageSchema = z.object({
  packageVersion: z.literal(
    "commercial-assets-v1"
  ),

  market: z.literal("COMMERCIAL"),

  actionName: z.string().min(5),

  ownerObjective:
    commercialOwnerObjectiveSchema,

  targetLabel: z.string().min(2),

  executiveSummary: z.string().min(20),

  assets: z
    .array(
      commercialPursuitAssetSchema
    )
    .min(12),

  readyNowAssetIds: z.array(
    z.string()
  ),

  ownerInputRequiredAssetIds: z.array(
    z.string()
  ),

  accountDiscoveryRequiredAssetIds: z.array(
    z.string()
  ),

  ownerInputRequirements: z.array(
    commercialOwnerInputRequirementSchema
  ),

  unresolvedAccountDiscoveryItems: z.array(
    z.string()
  ),

  assumptions: z.array(
    z.string()
  ),

  generatedAt: z
    .string()
    .datetime(),
});

export type CommercialPursuitAssetPackageSchema =
  z.infer<
    typeof commercialPursuitAssetPackageSchema
  >;