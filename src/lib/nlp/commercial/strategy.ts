import {
  zodResponseFormat,
} from "openai/helpers/zod";

import {
  openai,
} from "@/lib/openai";

import {
  commercialPursuitStrategySchema,
} from "@/lib/nlp/commercial/schema";

import {
  buildCommercialStrategyPrompt,
} from "@/lib/nlp/commercial/prompts";

import type {
  CommercialBusinessContext,
  CommercialPursuitStrategy,
  InterpretedCommercialIntent,
} from "@/lib/nlp/commercial/types";

function buildFallbackStrategy(params: {
  userPrompt: string;
  intent: InterpretedCommercialIntent;
  businessContext: CommercialBusinessContext;
}): CommercialPursuitStrategy {
    const {
      userPrompt,
      intent,
      businessContext,
    } = params;

  const targetDescription =
    intent.targetAccountName ??
    intent.targetAccountType
      .toLowerCase()
      .replace(/_/g, " ");

  const incumbentStrategy =
    intent.ownerObjective ===
    "INCUMBENT_DISPLACEMENT"
      ? [
          "Pursue a low-risk entry position rather than attacking the incumbent.",
          "Position the business as a qualified backup, overflow, pilot, or specialized-service option.",
          "Earn broader consideration through responsiveness, documentation, and execution.",
        ].join(" ")
      : null;

  return {
    strategyVersion:
      "commercial-v1",

    actionName:
      intent.targetAccountName
        ? `Pursue ${intent.targetAccountName}`
        : `Win More ${targetDescription} Work`,

    executiveSummary:
      `Build and launch a structured commercial pursuit for ${targetDescription}, beginning with account preparation and progressing through outreach, discovery, proposal, follow-up, and onboarding readiness.`,

    primaryObjective:
      intent.ownerObjective,

    targetDescription,

    desiredCommercialOutcome:
      `Create a qualified commercial relationship that can produce project work, recurring service, a maintenance agreement, or approved-vendor consideration.`,

    pursuitThesis:
      `The strongest entry is a practical, low-friction commercial conversation focused on operational reliability, communication, responsiveness, and reduced service disruption.`,

    entryStrategy:
      `Prepare a focused capability message, identify the appropriate operational or property stakeholder, and begin with direct outreach that requests a short qualification conversation rather than forcing an immediate sales commitment.`,

    differentiationStrategy:
      `Differentiate through clear communication, accountable service, documentation, responsiveness, and an easy working relationship rather than unsupported claims or price-first positioning.`,

    incumbentStrategy,

    recommendedLaunchMode:
      "MULTI_STEP_PURSUIT",

    accountResearchPriorities: [
      "Confirm the organization, locations, property portfolio, or facility type.",
      "Identify likely operational, property-management, facilities, or procurement stakeholders.",
      "Determine current service model, vendor structure, and likely service requirements.",
      "Identify credible entry points such as backup coverage, project work, recurring service, or maintenance.",
    ],

    likelyStakeholders: [
      {
        role:
          "Property, facility, or operations leader",

        influence:
          "DECISION_MAKER",

        likelyPriority:
          "Reliable service with minimal operational disruption.",

        engagementGoal:
          "Secure a qualification conversation and identify the account's service priorities.",
      },
      {
        role:
          "Administrative or procurement contact",

        influence:
          "GATEKEEPER",

        likelyPriority:
          "Complete vendor documentation and a clear procurement process.",

        engagementGoal:
          "Understand vendor onboarding requirements and the correct submission path.",
      },
      {
        role:
          "On-site manager or service user",

        influence:
          "INFLUENCER",

        likelyPriority:
          "Fast communication and practical resolution of service issues.",

        engagementGoal:
          "Understand day-to-day service pain points and operational expectations.",
      },
    ],

    positioningPillars: [
      {
        title:
          "Operational reliability",

        message:
          "Position the business as a dependable commercial service partner focused on reducing disruption and keeping the property or facility operating.",

        proofNeeded: [
          "Verified service capabilities",
          "Approved response expectations",
          "Relevant references or examples",
        ],
      },
      {
        title:
          "Communication and accountability",

        message:
          "Emphasize clear status updates, professional coordination, documentation, and ownership of each service request.",

        proofNeeded: [
          "Actual communication process",
          "Escalation process",
          "Sample reporting or documentation",
        ],
      },
      {
        title:
          "Low-risk starting point",

        message:
          "Offer a practical first engagement such as a walkthrough, pilot project, backup-vendor role, or defined service category.",

        proofNeeded: [
          "Approved initial service scope",
          "Operational capacity",
          "Owner-approved commercial terms",
        ],
      },
    ],

    pursuitSteps: [
      {
        phase:
          "ACCOUNT_RESEARCH",

        sequence: 1,

        title:
          "Prepare the account brief",

        objective:
          "Understand the organization, likely needs, relevant stakeholders, and credible entry position.",

        ownerAction:
          "Review and confirm the account information MarketForge assembles.",

        marketForgeDeliverable:
          "Account brief, research checklist, stakeholder hypotheses, and pursuit thesis.",

        completionSignal:
          "The owner can explain who is being pursued, why the account may care, and the intended entry point.",
      },
      {
        phase:
          "INITIAL_OUTREACH",

        sequence: 2,

        title:
          "Launch direct outreach",

        objective:
          "Earn a short commercial qualification conversation.",

        ownerAction:
          "Send the initial message, make the call, or visit the appropriate office.",

        marketForgeDeliverable:
          "Email, call talk track, voicemail, direct message, and office-visit guidance.",

        completionSignal:
          "The target account has received the introduction and a follow-up date is set.",
      },
      {
        phase:
          "QUALIFICATION",

        sequence: 3,

        title:
          "Qualify the commercial opportunity",

        objective:
          "Determine whether the account, service need, timing, and vendor pathway are commercially viable.",

        ownerAction:
          "Conduct the qualification conversation and record the answers.",

        marketForgeDeliverable:
          "Qualification questions, fit criteria, and call notes structure.",

        completionSignal:
          "The owner knows whether to advance, nurture, redirect, or stop the pursuit.",
      },
      {
        phase:
          "DISCOVERY",

        sequence: 4,

        title:
          "Define the account need",

        objective:
          "Understand service requirements, operational priorities, current process, and buying conditions.",

        ownerAction:
          "Conduct discovery with the relevant account stakeholder.",

        marketForgeDeliverable:
          "Discovery agenda, questions, recap template, and information-gap checklist.",

        completionSignal:
          "The problem, desired outcome, stakeholders, timing, and next step are documented.",
      },
      {
        phase:
          "WALKTHROUGH",

        sequence: 5,

        title:
          "Assess the property or facility",

        objective:
          "Translate the account conversation into an observable service opportunity and practical scope.",

        ownerAction:
          "Request and conduct a walkthrough when operationally relevant.",

        marketForgeDeliverable:
          "Walkthrough request, checklist, note structure, and post-visit recap.",

        completionSignal:
          "The owner has enough account-specific information to define the proposed service approach.",
      },
      {
        phase:
          "VENDOR_READINESS",

        sequence: 6,

        title:
          "Prepare vendor qualification",

        objective:
          "Reduce friction in the account's vendor-review or procurement process.",

        ownerAction:
          "Provide and verify the required business documents and operational facts.",

        marketForgeDeliverable:
          "Vendor-readiness checklist and capability-packet structure.",

        completionSignal:
          "All available vendor documentation is organized and missing requirements are identified.",
      },
      {
        phase:
          "PROPOSAL",

        sequence: 7,

        title:
          "Submit the commercial proposal",

        objective:
          "Present a clear service approach aligned to the account's actual requirements.",

        ownerAction:
          "Confirm scope, pricing, commitments, and legal terms before submission.",

        marketForgeDeliverable:
          "Proposal framework, executive summary, scope structure, option structure, and submission email.",

        completionSignal:
          "The account has received an owner-approved proposal with an agreed review date.",
      },
      {
        phase:
          "FOLLOW_UP",

        sequence: 8,

        title:
          "Manage proposal follow-up",

        objective:
          "Keep momentum without becoming repetitive or overly aggressive.",

        ownerAction:
          "Complete the scheduled follow-up sequence and record responses.",

        marketForgeDeliverable:
          "Post-proposal email sequence, call scripts, objection responses, and next-step prompts.",

        completionSignal:
          "The account has made a decision, requested changes, scheduled another discussion, or provided a concrete timeline.",
      },
      {
        phase:
          "NEGOTIATION",

        sequence: 9,

        title:
          "Resolve commercial terms",

        objective:
          "Clarify account concerns while protecting feasible scope, pricing, and service commitments.",

        ownerAction:
          "Approve any change to pricing, scope, service levels, or contract terms.",

        marketForgeDeliverable:
          "Negotiation preparation, trade-off checklist, and revised-proposal structure.",

        completionSignal:
          "Both parties have aligned on the proposed commercial relationship or documented why it will not proceed.",
      },
      {
        phase:
          "ONBOARDING",

        sequence: 10,

        title:
          "Prepare account onboarding",

        objective:
          "Convert the win into a well-managed operational relationship.",

        ownerAction:
          "Confirm contacts, billing, dispatch, escalation, documentation, and first-service expectations.",

        marketForgeDeliverable:
          "Kickoff agenda, account-information form, first-30-day plan, and communication structure.",

        completionSignal:
          "The new commercial account has a clear start date, contacts, service process, and ownership structure.",
      },
    ],

    discoveryObjectives: [
      "Understand the account's operational service needs and priorities.",
      "Identify the current vendor or service process without assuming dissatisfaction.",
      "Determine timing, stakeholders, procurement requirements, and decision criteria.",
      "Find a practical initial scope or relationship entry point.",
    ],

    qualificationCriteria: [
      "The account has a relevant service need or credible future need.",
      "The business can operationally support the likely work.",
      "There is a reachable stakeholder or defined vendor process.",
      "The opportunity has a realistic path to project, recurring, maintenance, or vendor revenue.",
    ],

    proposalPriorities: [
      "Reflect the account's verified needs and desired outcomes.",
      "Clearly separate scope, assumptions, exclusions, pricing, and optional services.",
      "Use only owner-approved operational commitments and commercial terms.",
      "Make next steps and acceptance requirements easy to understand.",
    ],

    objectionThemes: [
      "The account is satisfied with its current vendor.",
      "The business is not yet an approved vendor.",
      "The account is not ready to change or add providers.",
      "Pricing, coverage, capacity, or response expectations need clarification.",
      "The organization requires additional documentation, references, or procurement steps.",
    ],

    risks: [
      {
        risk:
          "The pursuit assumes needs or dissatisfaction that the account has not confirmed.",

        mitigation:
          "Use qualification and discovery language that tests needs rather than asserting them.",
      },
      {
        risk:
          "The business overcommits on capacity, response time, scope, or contract terms.",

        mitigation:
          "Require owner approval for all operational and commercial commitments.",
      },
      {
        risk:
          "The owner sends generic outreach that does not give the account a reason to respond.",

        mitigation:
          "Tie outreach to a credible operational outcome and a low-friction next step.",
      },
    ],

    ownerInputRequirements: [
            {
        key:
          "verified_commercial_capabilities",

        label:
          "Verified commercial capabilities",

        reason:
          "MarketForge can use stored services, but cannot invent coverage, staffing, equipment, response times, or commercial experience.",

        requiredBefore:
          "INITIAL_OUTREACH",

        valueType:
          "LIST",

        currentValue:
          businessContext.verifiedServices.length > 0
            ? businessContext.verifiedServices.join(", ")
            : intent.targetService,

        example:
          "Commercial plumbing repair, scheduled maintenance, emergency response during approved hours, and multi-unit property service.",
      },
      {
        key:
          "vendor_documents",

        label:
          "Vendor qualification documents",

        reason:
          "Commercial accounts may require proof of insurance, licenses, tax documents, safety information, or other vendor records.",

        requiredBefore:
          "PROPOSAL",

        valueType:
          "DOCUMENT",

        currentValue:
          null,

        example:
          "W-9, certificate of insurance, applicable licenses, safety policy, and reference list.",
      },
      {
        key:
          "approved_references",

        label:
          "Approved commercial references",

        reason:
          "References and experience claims must come from the business and require permission before use.",

        requiredBefore:
          "PROPOSAL",

        valueType:
          "LIST",

        currentValue:
          null,

        example:
          "Two property-management or facility references approved for commercial use.",
      },
      {
        key:
          "final_scope",

        label:
          "Final proposed scope",

        reason:
          "The final scope depends on account discovery, operational assessment, and owner approval.",

        requiredBefore:
          "PROPOSAL",

        valueType:
          "TEXT",

        currentValue:
          null,

        example:
          "Preventive maintenance for common-area systems plus defined after-hours repair coverage.",
      },
      {
        key:
          "final_pricing",

        label:
          "Final proposal pricing",

        reason:
          "MarketForge cannot invent or approve commercial pricing.",

        requiredBefore:
          "PROPOSAL",

        valueType:
          "CURRENCY",

        currentValue:
          null,

        example:
          "$[OWNER INPUT REQUIRED: Final proposal pricing]",
      },
      {
        key:
          "approved_service_commitments",

        label:
          "Approved service commitments",

        reason:
          "Response times, service levels, escalation procedures, and coverage must reflect actual operational capability.",

        requiredBefore:
          "CONTRACT",

        valueType:
          "LIST",

        currentValue:
          null,

        example:
          "Acknowledgment within an owner-approved period and escalation to the named account contact.",
      },
    ],

    readyNow: [
      "Account research framework",
      "Pursuit positioning",
      "Stakeholder hypotheses",
      "Initial outreach sequence",
      "Qualification and discovery questions",
      "Walkthrough framework",
      "Vendor-readiness checklist",
      "Proposal structure",
      "Follow-up sequence",
      "Objection-handling framework",
      "Onboarding structure",
    ],

    readyAfterOwnerCompletion: [
      "Capability statement using verified facts",
      "Vendor packet using actual documents",
      "Reference section using approved references",
      "Final operational commitments",
      "Owner-approved commercial terms",
    ],

    readyAfterAccountDiscovery: [
      "Account-specific scope",
      "Account-specific proposal",
      "Final pricing structure",
      "Service-level recommendations",
      "Procurement submission requirements",
      "Account onboarding configuration",
    ],

    successSignals: [
      "A relevant account stakeholder responds or accepts a qualification conversation.",
      "The account confirms a service need, vendor pathway, or future opportunity.",
      "A walkthrough, vendor-review step, proposal request, or defined follow-up is secured.",
      "The pursuit advances to an approved-vendor, project, recurring-service, maintenance, or account-expansion outcome.",
    ],

    assumptions: [
      ...intent.assumptions,

      `The fallback strategy was generated because AI strategy generation was unavailable for the request: ${userPrompt}`,
    ],
  };
}

export async function generateCommercialPursuitStrategy(
  params: {
    userPrompt: string;
    intent: InterpretedCommercialIntent;
    businessContext: CommercialBusinessContext;
  }
): Promise<CommercialPursuitStrategy> {
    const {
      userPrompt,
      intent,
      businessContext,
    } = params;

  try {
    const completion =
      await openai.chat.completions.create({
        model: "gpt-4.1",

        temperature: 0.2,

        response_format:
          zodResponseFormat(
            commercialPursuitStrategySchema,
            "commercial_pursuit_strategy"
          ),

        messages: [
          {
            role: "system",

            content:
              "You convert commercial revenue objectives into truthful, practical, execution-ready account pursuit strategies for local service businesses.",
          },
          {
            role: "user",

            content:
              buildCommercialStrategyPrompt({
                userPrompt,
                intent,
                businessContext,
              }),
          },
        ],
      });

    const rawContent =
      completion.choices[0]?.message
        ?.content;

    if (!rawContent) {
      throw new Error(
        "Commercial strategy generation returned no content."
      );
    }

    const parsed =
      commercialPursuitStrategySchema.parse(
        JSON.parse(rawContent)
      );

    if (
      parsed.primaryObjective !==
      intent.ownerObjective
    ) {
      throw new Error(
        "Commercial strategy changed the interpreted owner objective."
      );
    }

    const sortedSteps = [
      ...parsed.pursuitSteps,
    ]
      .sort(
        (left, right) =>
          left.sequence -
          right.sequence
      )
      .map(
        (step, index) => ({
          ...step,
          sequence: index + 1,
        })
      );

    return {
      ...parsed,
      pursuitSteps: sortedSteps,

      assumptions: Array.from(
        new Set([
          ...intent.assumptions,
          ...parsed.assumptions,
        ])
      ),
    };
  } catch (error) {
    console.error(
      "[commercial-strategy-generation-failed]",
      error
    );

    return buildFallbackStrategy({
      userPrompt,
      intent,
      businessContext,
    });
  }
}