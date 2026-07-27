import {
  commercialActionSpecSchema,
} from "@/lib/nlp/commercial/schema";

import type {
  CommercialActionSpec,
  CommercialActionType,
  CommercialExecutionPhase,
  CommercialExecutionTask,
  CommercialOwnerInputRequirement,
  CommercialPursuitPhase,
  CommercialPursuitStrategy,
  InterpretedCommercialIntent,
} from "@/lib/nlp/commercial/types";

function toDisplayLabel(
  value: string
) {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    );
}

function resolveActionType(
  objective:
    InterpretedCommercialIntent["ownerObjective"]
): CommercialActionType {
  switch (objective) {
    case "ACCOUNT_EXPANSION":
      return "COMMERCIAL_ACCOUNT_EXPANSION";

    case "COMMERCIAL_REACTIVATION":
      return "COMMERCIAL_REACTIVATION";

    case "VENDOR_RELATIONSHIP_DEVELOPMENT":
      return "COMMERCIAL_VENDOR_PURSUIT";

    case "MAINTENANCE_AGREEMENT_GROWTH":
    case "RECURRING_CONTRACT_GROWTH":
      return "COMMERCIAL_MAINTENANCE_GROWTH";

    case "INCUMBENT_DISPLACEMENT":
      return "COMMERCIAL_INCUMBENT_DISPLACEMENT";

    case "ACCOUNT_ACQUISITION":
    case "NAMED_ACCOUNT_PURSUIT":
    case "GENERAL_COMMERCIAL_GROWTH":
    default:
      return "COMMERCIAL_ACCOUNT_PURSUIT";
  }
}

function mapPursuitPhaseToExecutionPhase(
  phase: CommercialPursuitPhase
): CommercialExecutionPhase {
  switch (phase) {
    case "ACCOUNT_RESEARCH":
    case "VENDOR_READINESS":
      return "PREPARE";

    case "INITIAL_OUTREACH":
      return "OUTREACH";

    case "QUALIFICATION":
      return "QUALIFY";

    case "DISCOVERY":
      return "DISCOVER";

    case "WALKTHROUGH":
      return "ASSESS";

    case "PROPOSAL":
      return "PROPOSE";

    case "FOLLOW_UP":
      return "FOLLOW_UP";

    case "NEGOTIATION":
      return "NEGOTIATE";

    case "ONBOARDING":
      return "ONBOARD";

    default:
      return "PREPARE";
  }
}

function buildTaskId(params: {
  sequence: number;
  title: string;
}) {
  const slug = params.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return [
    String(params.sequence)
      .padStart(2, "0"),
    slug || "commercial-task",
  ].join("-");
}

function resolveBlockedInputKeys(params: {
  phase: CommercialExecutionPhase;
  ownerInputRequirements:
    CommercialOwnerInputRequirement[];
}) {
  const phaseThresholds: Record<
    CommercialExecutionPhase,
    CommercialOwnerInputRequirement["requiredBefore"][]
  > = {
    PREPARE: [],

    OUTREACH: [
      "INITIAL_OUTREACH",
    ],

    QUALIFY: [
      "INITIAL_OUTREACH",
    ],

    DISCOVER: [
      "DISCOVERY",
    ],

    ASSESS: [
      "DISCOVERY",
    ],

    PROPOSE: [
      "PROPOSAL",
    ],

    FOLLOW_UP: [
      "PROPOSAL",
    ],

    NEGOTIATE: [
      "CONTRACT",
    ],

    ONBOARD: [
      "ONBOARDING",
    ],
  };

  const requiredBeforeValues =
    phaseThresholds[params.phase];

  return params.ownerInputRequirements
    .filter((requirement) =>
      requiredBeforeValues.includes(
        requirement.requiredBefore
      )
    )
    .filter(
      (requirement) =>
        !requirement.currentValue
    )
    .map(
      (requirement) =>
        requirement.key
    );
}

function buildExecutionTasks(params: {
  strategy: CommercialPursuitStrategy;
}): CommercialExecutionTask[] {
  const sortedSteps = [
    ...params.strategy.pursuitSteps,
  ].sort(
    (left, right) =>
      left.sequence -
      right.sequence
  );

  return sortedSteps.map(
    (step, index) => {
      const sequence = index + 1;

      const phase =
        mapPursuitPhaseToExecutionPhase(
          step.phase
        );

      return {
        id: buildTaskId({
          sequence,
          title: step.title,
        }),

        sequence,

        phase,

        title: step.title,

        description:
          step.objective,

        ownerAction:
          step.ownerAction,

        marketForgeSupport:
          step.marketForgeDeliverable,

        completionSignal:
          step.completionSignal,

        blockedByOwnerInputKeys:
          resolveBlockedInputKeys({
            phase,

            ownerInputRequirements:
              params.strategy
                .ownerInputRequirements,
          }),
      };
    }
  );
}

function resolvePrimaryCallToAction(
  intent: InterpretedCommercialIntent
) {
  switch (intent.ownerObjective) {
    case "ACCOUNT_EXPANSION":
      return "Schedule an account expansion conversation";

    case "COMMERCIAL_REACTIVATION":
      return "Reopen the commercial relationship";

    case "VENDOR_RELATIONSHIP_DEVELOPMENT":
      return "Begin the vendor qualification process";

    case "MAINTENANCE_AGREEMENT_GROWTH":
      return "Schedule a maintenance needs assessment";

    case "RECURRING_CONTRACT_GROWTH":
      return "Discuss recurring service needs";

    case "INCUMBENT_DISPLACEMENT":
      return "Explore a low-risk vendor entry opportunity";

    case "NAMED_ACCOUNT_PURSUIT":
      return "Schedule a commercial qualification conversation";

    case "ACCOUNT_ACQUISITION":
    case "GENERAL_COMMERCIAL_GROWTH":
    default:
      return "Start a commercial service conversation";
  }
}

function resolveExpectedOutcome(
  intent: InterpretedCommercialIntent
) {
  switch (intent.ownerObjective) {
    case "ACCOUNT_EXPANSION":
      return "Expand the existing commercial relationship into additional project, recurring, or maintenance revenue.";

    case "COMMERCIAL_REACTIVATION":
      return "Reestablish a viable relationship with a past commercial account and identify a new revenue opportunity.";

    case "VENDOR_RELATIONSHIP_DEVELOPMENT":
      return "Earn approved, preferred, backup, or secondary vendor consideration.";

    case "MAINTENANCE_AGREEMENT_GROWTH":
      return "Secure a recurring commercial maintenance agreement with an appropriate account.";

    case "RECURRING_CONTRACT_GROWTH":
      return "Create a recurring commercial service relationship that produces predictable revenue.";

    case "INCUMBENT_DISPLACEMENT":
      return "Earn a credible entry position that can lead to partial or full replacement of the incumbent vendor.";

    case "NAMED_ACCOUNT_PURSUIT":
      return "Advance the named account from initial research to a qualified commercial opportunity.";

    case "ACCOUNT_ACQUISITION":
      return "Convert a qualified commercial prospect into project, recurring, maintenance, or vendor revenue.";

    case "GENERAL_COMMERCIAL_GROWTH":
    default:
      return "Identify and advance qualified commercial accounts toward a revenue-producing relationship.";
  }
}

function buildReadiness(
  strategy: CommercialPursuitStrategy
) {
  const blockingOwnerInputKeys =
    strategy.ownerInputRequirements
      .filter(
        (requirement) =>
          requirement.requiredBefore ===
            "INITIAL_OUTREACH" &&
          !requirement.currentValue
      )
      .map(
        (requirement) =>
          requirement.key
      );

  const proposalInputKeys =
    strategy.ownerInputRequirements
      .filter(
        (requirement) =>
          requirement.requiredBefore ===
            "PROPOSAL" ||
          requirement.requiredBefore ===
            "CONTRACT"
      )
      .map(
        (requirement) =>
          requirement.key
      );

  const onboardingInputKeys =
    strategy.ownerInputRequirements
      .filter(
        (requirement) =>
          requirement.requiredBefore ===
          "ONBOARDING"
      )
      .map(
        (requirement) =>
          requirement.key
      );

  return {
    readyNow:
      strategy.readyNow,

    readyAfterOwnerCompletion:
      strategy.readyAfterOwnerCompletion,

    readyAfterAccountDiscovery:
      strategy.readyAfterAccountDiscovery,

    blockingOwnerInputKeys,

    proposalInputKeys,

    onboardingInputKeys,
  };
}

export function buildCommercialActionSpec(
  params: {
    ownerPrompt: string;
    intent: InterpretedCommercialIntent;
    strategy: CommercialPursuitStrategy;
  }
): CommercialActionSpec {
  const {
    ownerPrompt,
    intent,
    strategy,
  } = params;

  const displayLabel =
    intent.targetAccountName ??
    toDisplayLabel(
      intent.targetAccountType
    );

  const spec: CommercialActionSpec = {
    specVersion:
      "commercial-action-v1",

    market:
      "COMMERCIAL",

    origin:
      "nl_custom",

    actionType:
      resolveActionType(
        intent.ownerObjective
      ),

    actionName:
      strategy.actionName,

    actionSummary:
      strategy.executiveSummary,

    ownerPrompt,

    ownerObjective:
      intent.ownerObjective,

    target: {
      accountName:
        intent.targetAccountName,

      accountType:
        intent.targetAccountType,

      displayLabel,

      namedIncumbent:
        intent.namedIncumbent,

      relationshipState:
        intent.relationshipState,

      relationshipGoal:
        intent.relationshipGoal,
    },

    targetService:
      intent.targetService,

    revenueModel:
      intent.revenueModel,

    launchMode:
      strategy.recommendedLaunchMode,

    primaryCallToAction:
      resolvePrimaryCallToAction(
        intent
      ),

    expectedOutcome:
      resolveExpectedOutcome(
        intent
      ),

    pursuitThesis:
      strategy.pursuitThesis,

    executionTasks:
      buildExecutionTasks({
        strategy,
      }),

    ownerInputRequirements:
      strategy.ownerInputRequirements,

    readiness:
      buildReadiness(
        strategy
      ),

    assumptions:
      Array.from(
        new Set([
          ...intent.assumptions,
          ...strategy.assumptions,
        ])
      ),

    risks:
      strategy.risks,

    successSignals:
      strategy.successSignals,

    metadata: {
      intentConfidence:
        intent.confidence,

      matchedSignals:
        intent.matchedSignals,

      strategyVersion:
        strategy.strategyVersion,

      generatedAt:
        new Date().toISOString(),
    },
  };

  return commercialActionSpecSchema.parse(
    spec
  );
}