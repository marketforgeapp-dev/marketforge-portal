import {
  zodResponseFormat,
} from "openai/helpers/zod";

import {
  openai,
} from "@/lib/openai";

import {
  commercialPursuitAssetPackageSchema,
} from "@/lib/nlp/commercial/schema";

import {
  buildCommercialAssetPrompt,
} from "@/lib/nlp/commercial/asset-prompts";

import type {
  CommercialActionSpec,
  CommercialBusinessContext,
  CommercialAssetCategory,
  CommercialAssetReadiness,
  CommercialOwnerInputRequirement,
  CommercialPursuitAsset,
  CommercialPursuitAssetPackage,
  CommercialPursuitStrategy,
  InterpretedCommercialIntent,
} from "@/lib/nlp/commercial/types";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function joinVerifiedServices(
  businessContext: CommercialBusinessContext
) {
  return businessContext.verifiedServices.length > 0
    ? businessContext.verifiedServices.join(", ")
    : null;
}

function replaceKnownBusinessPlaceholders(params: {
  content: string;
  businessContext: CommercialBusinessContext;
}) {
  const {
    businessContext,
  } = params;

    const verifiedServices =
    joinVerifiedServices(
      businessContext
    );

  const senderContact =
    businessContext.phone
      ? `[OWNER INPUT REQUIRED: Sender name]\n${businessContext.phone}`
      : "[OWNER INPUT REQUIRED: Sender name and contact information]";

  let content = params.content;

  const replacements: Array<
    [RegExp, string | null]
  > = [
    [
      /\[OWNER INPUT REQUIRED:\s*(?:Business|Company) name\]/gi,
      businessContext.businessName,
    ],
    [
      /\[(?:BUSINESS|COMPANY) NAME\]/gi,
      businessContext.businessName,
    ],

    [
      /\[OWNER INPUT REQUIRED:\s*(?:Business|Company)?\s*phone(?: number)?\]/gi,
      businessContext.phone,
    ],
    [
      /\[(?:BUSINESS |COMPANY )?PHONE(?: NUMBER)?\]/gi,
      businessContext.phone,
    ],

    [
      /\[OWNER INPUT REQUIRED:\s*(?:Business|Company)?\s*website\]/gi,
      businessContext.website,
    ],
    [
      /\[(?:BUSINESS |COMPANY )?WEBSITE\]/gi,
      businessContext.website,
    ],

    [
      /\[OWNER INPUT REQUIRED:\s*(?:Business )?service area\]/gi,
      businessContext.serviceArea,
    ],
    [
      /\[SERVICE AREA\]/gi,
      businessContext.serviceArea,
    ],

    [
      /\[OWNER INPUT REQUIRED:\s*(?:Verified )?commercial services?\]/gi,
      verifiedServices,
    ],
    [
      /\[OWNER INPUT REQUIRED:\s*(?:Verified )?service (?:category|categories)\]/gi,
      verifiedServices,
    ],
    [
      /\[(?:VERIFIED )?(?:COMMERCIAL )?SERVICE (?:CATEGORY|CATEGORIES|SERVICES)\]/gi,
      verifiedServices,
    ],

    [
      /\[OWNER INPUT REQUIRED:\s*Sender name and contact information\]/gi,
      senderContact,
    ],
    [
      /\[SENDER NAME AND CONTACT INFORMATION\]/gi,
      senderContact,
    ],
  ];

  for (const [pattern, replacement] of replacements) {
    if (replacement?.trim()) {
      content = content.replace(
        pattern,
        replacement.trim()
      );
    }
  }

  return content;
}

function isKnownWorkspaceInputRequirement(params: {
  key: string;
  businessContext: CommercialBusinessContext;
}) {
  const normalizedKey = params.key
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_");

  const knownKeys = new Set([
    "business_name",
    "company_name",
    "business_phone",
    "phone",
    "phone_number",
    "business_website",
    "website",
    "service_area",
    "business_service_area",
  ]);

  if (knownKeys.has(normalizedKey)) {
    return true;
  }

  if (
    params.businessContext
      .verifiedServices.length > 0 &&
    [
      "verified_services",
      "verified_commercial_services",
      "verified_commercial_capabilities",
      "commercial_services",
      "commercial_capabilities",
      "service_category",
      "verified_service_category",
    ].includes(normalizedKey)
  ) {
    return true;
  }

  return false;
}

function shouldIncludeMaintenanceAgreement(params: {
  userPrompt: string;
  actionSpec: CommercialActionSpec;
}) {
  if (
    params.actionSpec.ownerObjective ===
      "MAINTENANCE_AGREEMENT_GROWTH" ||
    params.actionSpec.ownerObjective ===
      "RECURRING_CONTRACT_GROWTH"
  ) {
    return true;
  }

  const normalizedPrompt =
    params.userPrompt.toLowerCase();

  const explicitlyRequestsMaintenance =
    [
      "maintenance",
      "preventive maintenance",
      "preventative maintenance",
      "service agreement",
      "maintenance agreement",
      "scheduled service",
    ].some((signal) =>
      normalizedPrompt.includes(signal)
    );

  return (
    params.actionSpec.ownerObjective ===
      "ACCOUNT_EXPANSION" &&
    explicitlyRequestsMaintenance
  );
}

function hydrateGeneratedAssetPackage(params: {
  packageResult: CommercialPursuitAssetPackage;
  businessContext: CommercialBusinessContext;
  includeMaintenanceAgreement: boolean;
}) {
  const filteredAssets =
    params.packageResult.assets.filter(
      (asset) =>
        params.includeMaintenanceAgreement ||
        asset.category !==
          "MAINTENANCE_AGREEMENT"
    );

  const hydratedAssets =
    filteredAssets.map((asset) => {
      const requiredOwnerInputKeys =
        asset.requiredOwnerInputKeys.filter(
          (key) =>
            !isKnownWorkspaceInputRequirement({
              key,
              businessContext:
                params.businessContext,
            })
        );

      const sections =
        asset.sections.map((section) => ({
          ...section,

          content:
            replaceKnownBusinessPlaceholders({
              content: section.content,
              businessContext:
                params.businessContext,
            }),
        }));

      const readiness =
        asset.readiness ===
          "OWNER_INPUT_REQUIRED" &&
        requiredOwnerInputKeys.length === 0 &&
        asset.requiredAccountDiscoveryItems
          .length === 0
          ? "READY_NOW"
          : asset.readiness;

      return {
        ...asset,
        readiness,
        requiredOwnerInputKeys,
        sections,

        usageInstructions:
          replaceKnownBusinessPlaceholders({
            content:
              asset.usageInstructions,
            businessContext:
              params.businessContext,
          }),

        completionSignal:
          replaceKnownBusinessPlaceholders({
            content:
              asset.completionSignal,
            businessContext:
              params.businessContext,
          }),
      };
    });

  const ownerInputRequirements =
    params.packageResult
      .ownerInputRequirements.filter(
        (requirement) =>
          !requirement.currentValue &&
          !isKnownWorkspaceInputRequirement({
            key: requirement.key,
            businessContext:
              params.businessContext,
          })
      );

  return commercialPursuitAssetPackageSchema.parse({
    ...params.packageResult,

    assets:
      hydratedAssets,

    readyNowAssetIds:
      hydratedAssets
        .filter(
          (asset) =>
            asset.readiness ===
            "READY_NOW"
        )
        .map((asset) => asset.id),

    ownerInputRequiredAssetIds:
      hydratedAssets
        .filter(
          (asset) =>
            asset.readiness ===
            "OWNER_INPUT_REQUIRED"
        )
        .map((asset) => asset.id),

    accountDiscoveryRequiredAssetIds:
      hydratedAssets
        .filter(
          (asset) =>
            asset.readiness ===
            "ACCOUNT_DISCOVERY_REQUIRED"
        )
        .map((asset) => asset.id),

    ownerInputRequirements,
  });
}

function createAsset(params: {
  category: CommercialAssetCategory;
  title: string;
  purpose: string;
  readiness: CommercialAssetReadiness;
  requiredOwnerInputKeys?: string[];
  requiredAccountDiscoveryItems?: string[];
  sections: Array<{
    heading: string;
    content: string;
  }>;
  usageInstructions: string;
  completionSignal: string;
}): CommercialPursuitAsset {
  return {
    id: slugify(
      `${params.category}-${params.title}`
    ),

    category:
      params.category,

    title:
      params.title,

    purpose:
      params.purpose,

    readiness:
      params.readiness,

    requiredOwnerInputKeys:
      params.requiredOwnerInputKeys ?? [],

    requiredAccountDiscoveryItems:
      params.requiredAccountDiscoveryItems ?? [],

    sections:
      params.sections,

    usageInstructions:
      params.usageInstructions,

    completionSignal:
      params.completionSignal,
  };
}

function inputKeysByStage(
  requirements:
    CommercialOwnerInputRequirement[],
  stages:
    CommercialOwnerInputRequirement["requiredBefore"][]
) {
  return requirements
    .filter((requirement) =>
      stages.includes(
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

function buildFallbackAssets(params: {
  userPrompt: string;
  intent: InterpretedCommercialIntent;
  strategy: CommercialPursuitStrategy;
  actionSpec: CommercialActionSpec;
  businessContext: CommercialBusinessContext;
}): CommercialPursuitAssetPackage {
  const {
    userPrompt,
    intent,
    strategy,
    actionSpec,
    businessContext,
  } = params;

  const target =
    actionSpec.target.displayLabel;

  const businessName =
    businessContext.businessName;

  const verifiedServices =
    joinVerifiedServices(
      businessContext
    );

  const outreachInputKeys =
    inputKeysByStage(
      actionSpec.ownerInputRequirements,
      ["INITIAL_OUTREACH"]
    );

  const proposalInputKeys =
    inputKeysByStage(
      actionSpec.ownerInputRequirements,
      ["PROPOSAL", "CONTRACT"]
    );

  const onboardingInputKeys =
    inputKeysByStage(
      actionSpec.ownerInputRequirements,
      ["ONBOARDING"]
    );

  const assets: CommercialPursuitAsset[] = [
    createAsset({
      category:
        "ACCOUNT_BRIEF",

      title:
        `${target} Account Pursuit Brief`,

      purpose:
        "Give the owner a concise working brief for the commercial pursuit.",

      readiness:
        "READY_NOW",

      sections: [
        {
          heading:
            "Objective",

          content:
            actionSpec.expectedOutcome,
        },
        {
          heading:
            "Pursuit thesis",

          content:
            actionSpec.pursuitThesis,
        },
        {
          heading:
            "Target",

          content:
            [
              `Account: ${target}`,
              `Account type: ${actionSpec.target.accountType}`,
              `Relationship state: ${actionSpec.target.relationshipState}`,
              `Relationship goal: ${actionSpec.target.relationshipGoal}`,
            ].join("\n"),
        },
        {
          heading:
            "Known facts",

          content:
            intent.ownerProvidedFacts.length
              ? intent.ownerProvidedFacts.join("\n")
              : "No account-specific facts have been verified beyond the owner's request.",
        },
        {
          heading:
            "Research priorities",

          content:
            strategy.accountResearchPriorities.join(
              "\n"
            ),
        },
      ],

      usageInstructions:
        "Review this brief before any outreach and update it as account facts are verified.",

      completionSignal:
        "The owner can explain the target, objective, likely buyer, and intended entry strategy.",
    }),

    createAsset({
      category:
        "CAPABILITY_STATEMENT",

      title:
        "Commercial Capability Statement",

      purpose:
        "Provide a concise commercial introduction that can be sent or included in a vendor packet.",

      readiness:
        outreachInputKeys.length
          ? "OWNER_INPUT_REQUIRED"
          : "READY_NOW",

      requiredOwnerInputKeys:
        outreachInputKeys,

      sections: [
        {
          heading:
            "Positioning",

          content:
            `We help commercial properties and organizations reduce service disruption through clear communication, accountable execution, and practical service support.`,
        },
        {
          heading:
            "Services",

          content:
            verifiedServices ??
            actionSpec.targetService ??
            "[OWNER INPUT REQUIRED: Verified commercial services]",
        },
        {
          heading:
            "Commercial outcomes",

          content:
            [
              "Reduced operational disruption",
              "Clear communication and service coordination",
              "Documented service activity",
              "A practical, accountable vendor relationship",
            ].join("\n"),
        },
        {
          heading:
            "Proof and credentials",

          content:
            [
              "[OWNER INPUT REQUIRED: Verified licenses]",
              "[OWNER INPUT REQUIRED: Insurance information]",
              "[OWNER INPUT REQUIRED: Approved commercial references]",
              "[OWNER INPUT REQUIRED: Verified service capabilities]",
            ].join("\n"),
        },
        {
          heading:
            "Next step",

          content:
            actionSpec.primaryCallToAction,
        },
      ],

      usageInstructions:
        "Complete every owner-input placeholder before sending externally.",

      completionSignal:
        "The capability statement contains only verified business facts and is ready to send.",
    }),

    createAsset({
      category:
        "INITIAL_OUTREACH",

      title:
        "Initial Commercial Outreach Sequence",

      purpose:
        "Start the commercial relationship with a direct, low-friction request.",

      readiness:
        outreachInputKeys.length
          ? "OWNER_INPUT_REQUIRED"
          : "READY_NOW",

      requiredOwnerInputKeys:
        outreachInputKeys,

      sections: [
        {
          heading:
            "Subject line options",

          content:
            [
              `Commercial service support for ${target}`,
              `A practical service resource for ${target}`,
              `Introduction and commercial service capabilities`,
            ].join("\n"),
        },
        {
          heading:
            "Initial email",

          content:
            `Hello [ACCOUNT CONTACT],\n\nI’m reaching out from ${businessName}. We support commercial organizations with ${
              verifiedServices ??
              "[OWNER INPUT REQUIRED: Verified commercial services]"
            }.\n\nOur focus is straightforward: responsive communication, accountable service, and reducing operational disruption.\n\nI’d welcome a brief conversation to learn how ${target} currently handles these needs and whether there may be a fit for project work, recurring support, maintenance, or backup coverage.\n\nWould you be open to a short conversation next week?\n\nThank you,\n[OWNER INPUT REQUIRED: Sender name]${
              businessContext.phone
                ? `\n${businessContext.phone}`
                : ""
            }`,
        },
        {
          heading:
            "Follow-up email",

          content:
            `Hello [ACCOUNT CONTACT],\n\nI wanted to follow up on my note regarding commercial service support for ${target}.\n\nEven if there is no immediate need, I’d be glad to introduce our capabilities and understand the correct process for future service or vendor consideration.\n\nWould a brief call be useful, or is there another person I should contact?`,
        },
        {
          heading:
            "Close-the-loop email",

          content:
            `Hello [ACCOUNT CONTACT],\n\nI’ll close the loop for now so I don’t continue filling your inbox.\n\nShould ${target} need [OWNER INPUT REQUIRED: Verified service category], project support, recurring service, or backup coverage in the future, I’d be glad to help.\n\nThank you for your time.`,
        },
      ],

      usageInstructions:
        "Send the initial message, schedule follow-up dates, and stop after the respectful close-the-loop message unless the account responds.",

      completionSignal:
        "The correct account contact has responded, redirected the owner, or received the completed outreach sequence.",
    }),

    createAsset({
      category:
        "PHONE_SCRIPT",

      title:
        "Commercial Qualification Call Script",

      purpose:
        "Help the owner earn a short qualification conversation without over-selling.",

      readiness:
        "READY_NOW",

      sections: [
        {
          heading:
            "Opening",

          content:
            `Hello, this is [OWNER NAME] with [BUSINESS NAME]. We provide commercial [SERVICE CATEGORY] support, and I’m trying to identify who handles service vendors or facility needs for ${target}.`,
        },
        {
          heading:
            "Reason for calling",

          content:
            `I’d like to briefly introduce our capabilities and understand whether you ever use additional, backup, project, recurring, or maintenance providers.`,
        },
        {
          heading:
            "Qualification questions",

          content:
            [
              "Who is responsible for this service area?",
              "Do you use one primary provider or multiple approved vendors?",
              "Are vendors reviewed only at renewal, or can new providers qualify during the year?",
              "Are there project, overflow, backup, or recurring needs that would justify a conversation?",
            ].join("\n"),
        },
        {
          heading:
            "Next-step request",

          content:
            actionSpec.primaryCallToAction,
        },
      ],

      usageInstructions:
        "Use this as a guide rather than reading it word-for-word. Record the contact, vendor process, need, and agreed next step.",

      completionSignal:
        "The owner has identified the right contact or confirmed the account's vendor pathway.",
    }),

    createAsset({
      category:
        "VOICEMAIL",

      title:
        "Commercial Voicemail",

      purpose:
        "Leave a concise message that gives the account a credible reason to respond.",

      readiness:
        "READY_NOW",

      sections: [
        {
          heading:
            "Voicemail",

          content:
            `Hello, this is [OWNER NAME] with [BUSINESS NAME]. We provide commercial [VERIFIED SERVICE CATEGORY] support, and I’m calling to learn who handles these needs for ${target}. I’d like to briefly introduce our capabilities and understand your vendor process. You can reach me at [PHONE NUMBER]. Again, this is [OWNER NAME] at [PHONE NUMBER]. Thank you.`,
        },
      ],

      usageInstructions:
        "Keep the voicemail under 30 seconds and follow it with the initial email when an address is available.",

      completionSignal:
        "The voicemail and supporting follow-up message have been delivered.",
    }),

    createAsset({
      category:
        "DIRECT_MESSAGE",

      title:
        "Commercial Direct Message",

      purpose:
        "Provide a concise LinkedIn or direct-message introduction.",

      readiness:
        "READY_NOW",

      sections: [
        {
          heading:
            "Message",

          content:
            `Hi [CONTACT NAME] — I’m with [BUSINESS NAME], a local commercial [SERVICE CATEGORY] provider. I’m reaching out to understand how ${target} handles service vendors and whether project, recurring, maintenance, or backup support may ever be useful. Would you be open to a brief introduction?`,
        },
      ],

      usageInstructions:
        "Use only when the recipient's role appears relevant. Do not send repeated unsolicited messages.",

      completionSignal:
        "The recipient responds, redirects the owner, or receives one respectful follow-up.",
    }),

    createAsset({
      category:
        "OFFICE_VISIT",

      title:
        "Commercial Office Visit Guide",

      purpose:
        "Help the owner make a professional in-person introduction without pressuring front-desk staff.",

      readiness:
        "READY_NOW",

      sections: [
        {
          heading:
            "Front-desk introduction",

          content:
            `Good morning. I’m [OWNER NAME] with [BUSINESS NAME]. We provide commercial [SERVICE CATEGORY] support. I’m not here to interrupt anyone — I’d just like to leave a brief capability statement and learn who handles facility service or vendor relationships.`,
        },
        {
          heading:
            "Contact request",

          content:
            `Could you tell me the appropriate person or department to follow up with?`,
        },
        {
          heading:
            "Leave-behind explanation",

          content:
            `This includes our verified services, contact information, and the types of commercial support we provide.`,
        },
        {
          heading:
            "Follow-up",

          content:
            `Send a short email referencing the visit and thanking the staff member who provided direction.`,
        },
      ],

      usageInstructions:
        "Keep the visit brief, professional, and respectful. Do not request an unscheduled sales meeting.",

      completionSignal:
        "The owner identifies the appropriate contact or leaves the approved capability material.",
    }),

    createAsset({
      category:
        "QUALIFICATION",

      title:
        "Commercial Opportunity Qualification Guide",

      purpose:
        "Determine whether the account has a credible path to revenue before investing heavily in the pursuit.",

      readiness:
        "ACCOUNT_DISCOVERY_REQUIRED",

      requiredAccountDiscoveryItems: [
        "Relevant service need",
        "Vendor structure",
        "Decision-maker access",
        "Timing",
        "Procurement path",
        "Operational fit",
      ],

      sections: [
        {
          heading:
            "Need",

          content:
            [
              "What services are currently required?",
              "Are needs project-based, recurring, maintenance-related, emergency-related, or mixed?",
              "Are there upcoming changes, projects, renewals, or operational risks?",
            ].join("\n"),
        },
        {
          heading:
            "Vendor process",

          content:
            [
              "How are new vendors evaluated?",
              "Is there a primary, backup, overflow, or approved-vendor structure?",
              "What documentation is required?",
            ].join("\n"),
        },
        {
          heading:
            "Commercial fit",

          content:
            [
              "Can the business support the likely scope?",
              "Is the account within the realistic service area?",
              "Is there a viable project, recurring, maintenance, or vendor revenue path?",
            ].join("\n"),
        },
        {
          heading:
            "Disqualification signals",

          content:
            [
              "No relevant need or future need",
              "Requirements outside the business's capabilities",
              "Unacceptable commercial or legal requirements",
              "No reachable stakeholder or procurement path",
              "Economics that cannot support the work",
            ].join("\n"),
        },
      ],

      usageInstructions:
        "Use during the first substantive conversation and record answers before advancing to discovery or proposal work.",

      completionSignal:
        "The opportunity is classified as advance, nurture, redirect, or stop.",
    }),

    createAsset({
      category:
        "DISCOVERY",

      title:
        "Commercial Discovery Guide",

      purpose:
        "Understand the account's operational needs, current process, decision criteria, and desired outcome.",

      readiness:
        "ACCOUNT_DISCOVERY_REQUIRED",

      requiredAccountDiscoveryItems: [
        "Operational priorities",
        "Current service process",
        "Stakeholders",
        "Decision criteria",
        "Scope",
        "Timing",
      ],

      sections: [
        {
          heading:
            "Operational environment",

          content:
            [
              "Which properties, systems, locations, or service categories are involved?",
              "What creates the greatest operational disruption?",
              "What must happen when a service issue occurs?",
            ].join("\n"),
        },
        {
          heading:
            "Current process",

          content:
            [
              "How are service requests submitted and tracked?",
              "How are updates communicated?",
              "What documentation is required after service?",
              "How are urgent issues escalated?",
            ].join("\n"),
        },
        {
          heading:
            "Vendor expectations",

          content:
            [
              "What matters most when evaluating a provider?",
              "What requirements are mandatory?",
              "What would make a low-risk first engagement useful?",
            ].join("\n"),
        },
        {
          heading:
            "Next step",

          content:
            `Confirm whether the next step is a walkthrough, vendor review, pilot scope, proposal, or scheduled follow-up.`,
        },
      ],

      usageInstructions:
        "Ask open-ended questions and avoid assuming the current process is broken.",

      completionSignal:
        "The owner has documented the need, stakeholders, buying process, timing, and agreed next step.",
    }),

    createAsset({
      category:
        "WALKTHROUGH",

      title:
        "Commercial Walkthrough Package",

      purpose:
        "Turn the account conversation into an observable service opportunity and defensible proposed scope.",

      readiness:
        "ACCOUNT_DISCOVERY_REQUIRED",

      requiredAccountDiscoveryItems: [
        "Walkthrough approval",
        "Locations or systems included",
        "Safety requirements",
        "Operational constraints",
        "Scope observations",
      ],

      sections: [
        {
          heading:
            "Walkthrough request",

          content:
            `Thank you for the conversation. A brief walkthrough would help us understand the property or facility, confirm the service environment, and determine whether there is a practical next step. We will not finalize scope, pricing, or service commitments until the relevant conditions are reviewed.`,
        },
        {
          heading:
            "Checklist",

          content:
            [
              "Areas, systems, properties, or assets included",
              "Existing service condition",
              "Access limitations",
              "Operating hours",
              "Safety and security requirements",
              "Documentation requirements",
              "Urgent versus planned service needs",
              "Potential initial or pilot scope",
            ].join("\n"),
        },
        {
          heading:
            "Post-walkthrough recap",

          content:
            [
              "What was observed",
              "What remains unknown",
              "What the account identified as important",
              "What requires owner verification",
              "Recommended next step",
            ].join("\n"),
        },
      ],

      usageInstructions:
        "Do not promise scope, price, coverage, or service levels during the walkthrough without owner approval.",

      completionSignal:
        "The owner has enough verified information to prepare an account-specific proposal or next-step recommendation.",
    }),

    createAsset({
      category:
        "VENDOR_READINESS",

      title:
        "Commercial Vendor Readiness Checklist",

      purpose:
        "Organize the business information and documents commonly required for vendor qualification.",

      readiness:
        "OWNER_INPUT_REQUIRED",

      requiredOwnerInputKeys:
        actionSpec.ownerInputRequirements
          .filter(
            (requirement) =>
              !requirement.currentValue &&
              !isKnownWorkspaceInputRequirement({
                key: requirement.key,
                businessContext,
              })
          )
          .map(
            (requirement) =>
              requirement.key
          ),

      sections: [
        {
          heading:
            "Business documents",

          content:
            [
              "[OWNER INPUT REQUIRED: W-9]",
              "[OWNER INPUT REQUIRED: Certificate of insurance]",
              "[OWNER INPUT REQUIRED: Applicable licenses]",
              "[OWNER INPUT REQUIRED: Business registration information]",
            ].join("\n"),
        },
        {
          heading:
            "Operational information",

          content:
            [
              "[OWNER INPUT REQUIRED: Verified service capabilities]",
              "[OWNER INPUT REQUIRED: Service area]",
              "[OWNER INPUT REQUIRED: Operating hours]",
              "[OWNER INPUT REQUIRED: Escalation process]",
              "[OWNER INPUT REQUIRED: Communication process]",
            ].join("\n"),
        },
        {
          heading:
            "Proof",

          content:
            [
              "[OWNER INPUT REQUIRED: Approved references]",
              "[OWNER INPUT REQUIRED: Relevant project examples]",
              "[OWNER INPUT REQUIRED: Safety information]",
            ].join("\n"),
        },
        {
          heading:
            "Account-specific requirements",

          content:
            "[ACCOUNT DISCOVERY REQUIRED: Vendor onboarding and procurement requirements]",
        },
      ],

      usageInstructions:
        "Collect and verify all materials before submission. Do not send expired, incomplete, or unapproved documents.",

      completionSignal:
        "The business has a complete vendor packet or a documented list of missing account requirements.",
    }),

    createAsset({
      category:
        "PROPOSAL",

      title:
        "Commercial Proposal Framework",

      purpose:
        "Provide the complete proposal structure while preserving owner control over final scope, pricing, commitments, and legal terms.",

      readiness:
        "ACCOUNT_DISCOVERY_REQUIRED",

      requiredOwnerInputKeys:
        proposalInputKeys,

      requiredAccountDiscoveryItems: [
        "Verified account need",
        "Final scope",
        "Locations or systems included",
        "Timing",
        "Decision criteria",
        "Procurement requirements",
      ],

      sections: [
        {
          heading:
            "Executive summary",

          content:
            `This proposal outlines a commercial service approach for ${target} based on the verified operational needs and priorities identified during discovery.`,
        },
        {
          heading:
            "Current situation",

          content:
            "[ACCOUNT DISCOVERY REQUIRED: Verified current situation, service need, operational risk, or desired outcome]",
        },
        {
          heading:
            "Proposed approach",

          content:
            "[ACCOUNT DISCOVERY REQUIRED: Recommended service approach]",
        },
        {
          heading:
            "Scope of work",

          content:
            "[OWNER INPUT REQUIRED: Final approved proposal scope]",
        },
        {
          heading:
            "Assumptions",

          content:
            "[OWNER INPUT REQUIRED: Scope assumptions and owner-approved operating conditions]",
        },
        {
          heading:
            "Exclusions",

          content:
            "[OWNER INPUT REQUIRED: Explicit exclusions]",
        },
        {
          heading:
            "Pricing",

          content:
            "[OWNER INPUT REQUIRED: Final proposal pricing]",
        },
        {
          heading:
            "Service expectations",

          content:
            "[OWNER INPUT REQUIRED: Approved response, communication, documentation, and escalation commitments]",
        },
        {
          heading:
            "Timeline",

          content:
            "[ACCOUNT DISCOVERY REQUIRED: Approved start date, schedule, milestones, or service frequency]",
        },
        {
          heading:
            "Acceptance",

          content:
            "[OWNER INPUT REQUIRED: Approved acceptance language and legal terms]",
        },
        {
          heading:
            "Next step",

          content:
            "Confirm a proposal review conversation and establish the decision timeline.",
        },
      ],

      usageInstructions:
        "Do not submit until every owner-input and account-discovery placeholder is completed and approved.",

      completionSignal:
        "The account receives a complete, owner-approved proposal with a scheduled review date.",
    }),

    createAsset({
      category:
        "OBJECTION_HANDLING",

      title:
        "Commercial Objection Response Guide",

      purpose:
        "Help the owner respond credibly without attacking competitors or making unauthorized commitments.",

      readiness:
        "READY_NOW",

      sections: [
        {
          heading:
            "We already have a vendor",

          content:
            `That makes sense. We are not asking you to disrupt a relationship that is working. We would be glad to understand whether backup, overflow, specialized, project, or future renewal consideration could be useful.`,
        },
        {
          heading:
            "Send me information",

          content:
            `Absolutely. I’ll send a concise capability overview. Before I do, is there a particular service category, vendor requirement, or future need that would make the information more relevant?`,
        },
        {
          heading:
            "We are not ready",

          content:
            `Understood. Is there a better time to reconnect, or a renewal, project, budget, or planning period we should align with?`,
        },
        {
          heading:
            "Your price may be too high",

          content:
            `Before discussing price, we should confirm the actual scope, service expectations, and operational requirements. Once those are clear, we can determine whether there is a workable approach.`,
        },
        {
          heading:
            "We require approved vendors",

          content:
            `Thank you. Could you share the correct vendor-qualification process and the documentation required for consideration?`,
        },
        {
          heading:
            "Can you guarantee coverage or response time?",

          content:
            `We only commit to service levels after verifying scope, location, timing, staffing, and operational capacity. We would document any approved commitment clearly in the proposal.`,
        },
      ],

      usageInstructions:
        "Use the responses as a framework and never promise pricing, scope, capacity, or service levels without owner approval.",

      completionSignal:
        "The objection is clarified and converted into a next step, nurture date, requirement, or documented stop decision.",
    }),

    createAsset({
      category:
        "FOLLOW_UP",

      title:
        "Commercial Follow-Up Sequence",

      purpose:
        "Maintain pursuit momentum through meetings, walkthroughs, proposals, and delayed decisions.",

      readiness:
        "READY_NOW",

      sections: [
        {
          heading:
            "Post-meeting",

          content:
            `Thank you for the conversation. My understanding is that [ACCOUNT DISCOVERY REQUIRED: Need], [ACCOUNT DISCOVERY REQUIRED: Priority], and [ACCOUNT DISCOVERY REQUIRED: Next step] are the key points. Please let me know if I missed anything.`,
        },
        {
          heading:
            "Post-walkthrough",

          content:
            `Thank you for the walkthrough. We are organizing the observations, confirming remaining questions, and preparing the recommended next step. We will not finalize scope or pricing until the required information is verified.`,
        },
        {
          heading:
            "Post-proposal",

          content:
            `I wanted to confirm you received the proposal and ask whether any part of the scope, assumptions, options, or next steps requires clarification. Would it be useful to schedule a brief review?`,
        },
        {
          heading:
            "Delayed decision",

          content:
            `Thank you for the update. I’ll align our follow-up with your timeline. Is there a specific date, internal milestone, renewal period, or budget event we should use?`,
        },
        {
          heading:
            "Close the loop",

          content:
            `I’ll close the loop for now. Should the need, vendor process, project timing, or service requirements change, we would be glad to reconnect.`,
        },
      ],

      usageInstructions:
        "Schedule each follow-up around a real next step or account timeline rather than sending repetitive messages.",

      completionSignal:
        "The account advances, provides a decision timeline, requests changes, or receives a respectful close-the-loop message.",
    }),

    createAsset({
      category:
        "NEGOTIATION",

      title:
        "Commercial Negotiation Preparation",

      purpose:
        "Protect feasible scope, pricing, service commitments, and owner approval during commercial negotiation.",

      readiness:
        "OWNER_INPUT_REQUIRED",

      requiredOwnerInputKeys:
        proposalInputKeys,

      sections: [
        {
          heading:
            "Clarify before changing terms",

          content:
            [
              "What specific issue is preventing approval?",
              "Is the concern scope, price, timing, risk, service level, documentation, or contract language?",
              "What does the account need to move forward?",
            ].join("\n"),
        },
        {
          heading:
            "Owner approval boundaries",

          content:
            [
              "No unapproved discount",
              "No added scope without pricing review",
              "No response-time guarantee without capacity review",
              "No legal-term acceptance without owner approval",
              "No service-level commitment that operations cannot support",
            ].join("\n"),
        },
        {
          heading:
            "Trade-off framework",

          content:
            [
              "Reduce scope rather than discounting blindly",
              "Change frequency or service level",
              "Phase implementation",
              "Separate required and optional services",
              "Use a pilot or defined initial period",
            ].join("\n"),
        },
        {
          heading:
            "Revised proposal checklist",

          content:
            [
              "Document every approved change",
              "Update scope, assumptions, exclusions, pricing, and timing",
              "Confirm version and decision date",
              "Preserve a record of prior terms",
            ].join("\n"),
        },
      ],

      usageInstructions:
        "The owner must approve every material change before revised terms are sent.",

      completionSignal:
        "Both parties align on approved terms or document why the pursuit will not proceed.",
    }),

    createAsset({
      category:
        "ONBOARDING",

      title:
        "Commercial Account Onboarding Package",

      purpose:
        "Convert the commercial win into a clear operational relationship.",

      readiness:
        "OWNER_INPUT_REQUIRED",

      requiredOwnerInputKeys:
        onboardingInputKeys,

      requiredAccountDiscoveryItems: [
        "Account contacts",
        "Billing process",
        "Dispatch process",
        "Escalation contacts",
        "Reporting requirements",
        "Start date",
      ],

      sections: [
        {
          heading:
            "Acceptance confirmation",

          content:
            `Thank you for selecting [BUSINESS NAME]. We are preparing the account for launch and will confirm the approved scope, contacts, billing, service process, and start date before work begins.`,
        },
        {
          heading:
            "Kickoff agenda",

          content:
            [
              "Approved scope",
              "Locations or systems covered",
              "Primary and backup contacts",
              "Service-request process",
              "Dispatch and scheduling",
              "Communication expectations",
              "Escalation",
              "Billing",
              "Documentation",
              "First 30 days",
            ].join("\n"),
        },
        {
          heading:
            "Account information",

          content:
            [
              "[ACCOUNT DISCOVERY REQUIRED: Primary account contact]",
              "[ACCOUNT DISCOVERY REQUIRED: Billing contact]",
              "[ACCOUNT DISCOVERY REQUIRED: Service-request contact]",
              "[ACCOUNT DISCOVERY REQUIRED: Escalation contact]",
              "[ACCOUNT DISCOVERY REQUIRED: Property or facility locations]",
            ].join("\n"),
        },
        {
          heading:
            "First 30 days",

          content:
            [
              "Confirm account setup",
              "Complete first service or kickoff activity",
              "Verify communication process",
              "Review documentation",
              "Resolve early operational gaps",
              "Schedule relationship review",
            ].join("\n"),
        },
      ],

      usageInstructions:
        "Complete the package after acceptance and before the first planned service whenever possible.",

      completionSignal:
        "The account has a confirmed start date, contacts, service process, billing path, escalation structure, and first-30-day plan.",
    }),
  ];

  const maintenanceRelevant =
    shouldIncludeMaintenanceAgreement({
      userPrompt,
      actionSpec,
    });

  if (maintenanceRelevant) {
    assets.splice(
      12,
      0,
      createAsset({
        category:
          "MAINTENANCE_AGREEMENT",

        title:
          "Commercial Maintenance Agreement Framework",

        purpose:
          "Provide a complete recurring-service agreement structure without inventing service frequency, price, or commitments.",

        readiness:
          "ACCOUNT_DISCOVERY_REQUIRED",

        requiredOwnerInputKeys:
          proposalInputKeys,

        requiredAccountDiscoveryItems: [
          "Covered services",
          "Service frequency",
          "Locations or systems",
          "Documentation requirements",
          "Escalation requirements",
        ],

        sections: [
          {
            heading:
              "Agreement objective",

            content:
              `Create a predictable service relationship that supports operational continuity, preventive care, communication, and documented accountability.`,
          },
          {
            heading:
              "Covered services",

            content:
              "[ACCOUNT DISCOVERY REQUIRED: Covered services and service locations]",
          },
          {
            heading:
              "Service frequency",

            content:
              "[ACCOUNT DISCOVERY REQUIRED: Recommended and approved service frequency]",
          },
          {
            heading:
              "Documentation",

            content:
              "[ACCOUNT DISCOVERY REQUIRED: Required reports, service records, photos, or account updates]",
          },
          {
            heading:
              "Escalation",

            content:
              "[OWNER INPUT REQUIRED: Approved escalation and response process]",
          },
          {
            heading:
              "Exclusions",

            content:
              "[OWNER INPUT REQUIRED: Excluded services, conditions, and additional-charge triggers]",
          },
          {
            heading:
              "Pricing",

            content:
              "[OWNER INPUT REQUIRED: Final maintenance agreement pricing]",
          },
          {
            heading:
              "Term and renewal",

            content:
              "[OWNER INPUT REQUIRED: Agreement term, renewal, termination, and legal language]",
          },
        ],

        usageInstructions:
          "Complete all account-discovery and owner-input sections before presenting the agreement.",

        completionSignal:
          "The account receives an owner-approved maintenance agreement aligned to verified needs.",
      })
    );
  }

  const readyNowAssetIds =
    assets
      .filter(
        (asset) =>
          asset.readiness ===
          "READY_NOW"
      )
      .map(
        (asset) =>
          asset.id
      );

  const ownerInputRequiredAssetIds =
    assets
      .filter(
        (asset) =>
          asset.readiness ===
          "OWNER_INPUT_REQUIRED"
      )
      .map(
        (asset) =>
          asset.id
      );

  const accountDiscoveryRequiredAssetIds =
    assets
      .filter(
        (asset) =>
          asset.readiness ===
          "ACCOUNT_DISCOVERY_REQUIRED"
      )
      .map(
        (asset) =>
          asset.id
      );

    const fallbackPackage =
      commercialPursuitAssetPackageSchema.parse({
    packageVersion:
      "commercial-assets-v1",

    market:
      "COMMERCIAL",

    actionName:
      actionSpec.actionName,

    ownerObjective:
      actionSpec.ownerObjective,

    targetLabel:
      actionSpec.target.displayLabel,

    executiveSummary:
      `MarketForge generated the complete Commercial pursuit package for ${target}, covering research, outreach, qualification, discovery, walkthrough, vendor readiness, proposal, follow-up, negotiation, and onboarding.`,

    assets,

    readyNowAssetIds,

    ownerInputRequiredAssetIds,

    accountDiscoveryRequiredAssetIds,

    ownerInputRequirements:
      actionSpec.ownerInputRequirements,

    unresolvedAccountDiscoveryItems:
      Array.from(
        new Set(
          assets.flatMap(
            (asset) =>
              asset.requiredAccountDiscoveryItems
          )
        )
      ),

    assumptions:
      actionSpec.assumptions,

    generatedAt:
      new Date().toISOString(),
    });

  return hydrateGeneratedAssetPackage({
    packageResult:
      fallbackPackage,

    businessContext,

    includeMaintenanceAgreement:
      maintenanceRelevant,
  });
}

function ensureRequiredCategories(
  packageResult:
    CommercialPursuitAssetPackage
) {
  const requiredCategories:
    CommercialAssetCategory[] = [
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
      "OBJECTION_HANDLING",
      "FOLLOW_UP",
      "NEGOTIATION",
      "ONBOARDING",
    ];

  const generatedCategories =
    new Set(
      packageResult.assets.map(
        (asset) =>
          asset.category
      )
    );

  const missing =
    requiredCategories.filter(
      (category) =>
        !generatedCategories.has(
          category
        )
    );

  if (missing.length > 0) {
    throw new Error(
      `Commercial asset package is missing required categories: ${missing.join(
        ", "
      )}`
    );
  }
}

export async function generateCommercialPursuitAssets(
  params: {
    userPrompt: string;
    intent: InterpretedCommercialIntent;
    strategy: CommercialPursuitStrategy;
    actionSpec: CommercialActionSpec;
    businessContext: CommercialBusinessContext;
  }
): Promise<CommercialPursuitAssetPackage> {
  const {
    userPrompt,
    intent,
    strategy,
    actionSpec,
    businessContext,
  } = params;

  const includeMaintenanceAgreement =
    shouldIncludeMaintenanceAgreement({
      userPrompt,
      actionSpec,
    });

  try {
    const completion =
      await openai.chat.completions.create({
        model: "gpt-4.1",

        temperature: 0.2,

        response_format:
          zodResponseFormat(
            commercialPursuitAssetPackageSchema,
            "commercial_pursuit_asset_package"
          ),

        messages: [
          {
            role:
              "system",

            content:
              "You generate truthful, practical, execution-ready Commercial pursuit assets for local service businesses.",
          },
          {
            role:
              "user",

            content:
              buildCommercialAssetPrompt({
                userPrompt,
                intent,
                strategy,
                actionSpec,
                businessContext,
              }),
          },
        ],
      });

    const rawContent =
      completion.choices[0]
        ?.message
        ?.content;

    if (!rawContent) {
      throw new Error(
        "Commercial asset generation returned no content."
      );
    }

    const parsed =
      commercialPursuitAssetPackageSchema.parse(
        JSON.parse(rawContent)
      );

    if (
      parsed.ownerObjective !==
      actionSpec.ownerObjective
    ) {
      throw new Error(
        "Commercial asset generation changed the owner objective."
      );
    }

    if (
      parsed.targetLabel !==
      actionSpec.target.displayLabel
    ) {
      throw new Error(
        "Commercial asset generation changed the target label."
      );
    }

    ensureRequiredCategories(
      parsed
    );

    const normalizedAssets =
      parsed.assets.map(
        (asset) => ({
          ...asset,

          id:
            asset.id ||
            slugify(
              `${asset.category}-${asset.title}`
            ),
        })
      );

    const normalizedPackage =
      commercialPursuitAssetPackageSchema.parse({
        ...parsed,

        assets:
          normalizedAssets,

        readyNowAssetIds:
          normalizedAssets
            .filter(
              (asset) =>
                asset.readiness ===
                "READY_NOW"
            )
            .map(
              (asset) =>
                asset.id
            ),

        ownerInputRequiredAssetIds:
          normalizedAssets
            .filter(
              (asset) =>
                asset.readiness ===
                "OWNER_INPUT_REQUIRED"
            )
            .map(
              (asset) =>
                asset.id
            ),

        accountDiscoveryRequiredAssetIds:
          normalizedAssets
            .filter(
              (asset) =>
                asset.readiness ===
                "ACCOUNT_DISCOVERY_REQUIRED"
            )
            .map(
              (asset) =>
                asset.id
            ),

        ownerInputRequirements:
          actionSpec.ownerInputRequirements,

        assumptions:
          Array.from(
            new Set([
              ...actionSpec.assumptions,
              ...parsed.assumptions,
            ])
          ),

        generatedAt:
          new Date().toISOString(),
      });

    return hydrateGeneratedAssetPackage({
      packageResult:
        normalizedPackage,

      businessContext,

      includeMaintenanceAgreement,
    });
  } catch (error) {
    console.error(
      "[commercial-asset-generation-failed]",
      error
    );

    return buildFallbackAssets({
      userPrompt,
      intent,
      strategy,
      actionSpec,
      businessContext,
    });
  }
}