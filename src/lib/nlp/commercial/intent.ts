import {
  interpretedCommercialIntentSchema,
} from "@/lib/nlp/commercial/schema";

import {
  includesCommercialSignal,
  normalizeCommercialFragment,
  normalizeCommercialPromptForMatching,
} from "@/lib/nlp/commercial/normalization";

import type {
  CommercialAccountType,
  CommercialOwnerObjective,
  CommercialRelationshipGoal,
  CommercialRelationshipState,
  CommercialRevenueModel,
  InterpretedCommercialIntent,
} from "@/lib/nlp/commercial/types";

function cleanOrganizationName(
  value: string | undefined
) {
  if (!value) return null;

  const cleaned = value
    // Stop when the captured text clearly begins another sentence.
    .replace(
      /[.!?]\s+(?:i|we|they|he|she|our|their|the)\b.*$/i,
      ""
    )
    .replace(/[.!?]+$/g, "")
    .replace(
      /\b(?:so we can|because|in order to)\b.*$/i,
      ""
    )
    .trim();

  return cleaned.length >= 3
    ? cleaned
    : null;
}

function looksLikeGenericAccountCategory(
  value: string
) {
  const normalized =
    normalizeCommercialFragment(value);

  const genericCategories = [
    "apartment",
    "apartments",
    "apartment complex",
    "apartment complexes",
    "apartment community",
    "apartment communities",
    "an apartment community",
    "one apartment community",
    "the apartment community",
    "multifamily",
    "multi family",

    "property management",
    "property managers",
    "property management companies",
    "a property management company",
    "one property management company",
    "the property management company",

    "facility managers",
    "facility management",
    "facilities",

    "commercial accounts",
    "commercial customers",
    "commercial businesses",
    "commercial work",

    "hotel",
    "hotels",
    "a hotel",
    "one hotel",
    "the hotel",

    "hospital",
    "hospitals",
    "a hospital",
    "one hospital",
    "the hospital",

    "schools",
    "universities",
    "colleges",
    "restaurants",
    "retail stores",
    "warehouses",
    "manufacturers",
    "government contracts",
    "municipal contracts",

    "hoas",
    "homeowners associations",
    ];

  return genericCategories.some(
    (category) =>
      normalized ===
      normalizeCommercialFragment(category)
  );
}

function looksLikeNamedOrganization(
  value: string
) {
  const cleaned =
    cleanOrganizationName(value);

  if (!cleaned) return false;

  if (
    looksLikeGenericAccountCategory(cleaned)
  ) {
    return false;
  }

  const normalized =
    normalizeCommercialFragment(cleaned);

  const organizationSignals = [
    "property management",
    "management",
    "hospital",
    "medical center",
    "health system",
    "hotel",
    "resort",
    "school",
    "academy",
    "university",
    "college",
    "apartments",
    "apartment homes",
    "hoa",
    "association",
    "company",
    "corporation",
    "corp",
    "inc",
    "llc",
    "facilities",
    "facility",
    "group",
    "partners",
    "enterprises",
  ];

  if (
    organizationSignals.some((signal) =>
      normalized.includes(signal)
    )
  ) {
    return true;
  }

  const words = cleaned
    .split(/\s+/)
    .filter(Boolean);

  const hasCapitalizedNameWord =
    words.some((word) =>
      /^[A-Z][A-Za-z0-9&.'-]*$/.test(word)
    );

  return (
    words.length >= 2 &&
    hasCapitalizedNameWord
  );
}

function extractTargetAccountName(
  prompt: string
) {
  const cleanedPrompt =
    prompt.trim();

  const patterns = [
    // Displacement request:
    // "Replace Superior Plumbing at Memorial Hospital"
    // Target account = Memorial Hospital
    /\b(?:replace|displace|take over from)\s+.+?\s+(?:at|for|with)\s+(.+)$/i,

    // Named pursuit:
    // "I want to work with ABC Property Management"
    // "I want ABC Property Management"
    /\bi\s+want\s+(?:to\s+work\s+with\s+|to\s+win\s+|to\s+pursue\s+)?(.+)$/i,

    /\b(?:pursue|win|target|approach|contact)\s+(.+)$/i,

    /\b(?:at|with|for)\s+(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match =
      cleanedPrompt.match(pattern);

    const candidate =
      cleanOrganizationName(match?.[1]);

    if (
      candidate &&
      looksLikeNamedOrganization(candidate)
    ) {
      return candidate;
    }
  }

  return null;
}

function inferAccountType(
  normalizedPrompt: string
): CommercialAccountType {
  if (
    includesCommercialSignal(
      normalizedPrompt,
      [
        "property management",
        "property manager",
      ]
    )
  ) {
    return "PROPERTY_MANAGEMENT_COMPANY";
  }

  if (
    includesCommercialSignal(
      normalizedPrompt,
      [
        "apartment complex",
        "apartment complexes",
        "apartment community",
        "apartment communities",
        "multifamily",
        "multi family",
      ]
    )
  ) {
    return "APARTMENT_COMMUNITY";
  }

  if (
    includesCommercialSignal(
      normalizedPrompt,
      [
        "hoa",
        "homeowners association",
      ]
    )
  ) {
    return "HOA";
  }

  if (
    includesCommercialSignal(
      normalizedPrompt,
      [
        "facility manager",
        "facility management",
        "facilities manager",
      ]
    )
  ) {
    return "FACILITY_MANAGEMENT";
  }

  if (
    includesCommercialSignal(
      normalizedPrompt,
      [
        "hotel",
        "hospitality",
        "resort",
      ]
    )
  ) {
    return "HOTEL_HOSPITALITY";
  }

  if (
    includesCommercialSignal(
      normalizedPrompt,
      [
        "hospital",
        "medical facility",
        "medical center",
        "healthcare",
        "health system",
      ]
    )
  ) {
    return "HEALTHCARE_FACILITY";
  }

  if (
    includesCommercialSignal(
      normalizedPrompt,
      [
        "school",
        "academy",
        "university",
        "college",
        "school district",
      ]
    )
  ) {
    return "EDUCATION";
  }

  if (
    includesCommercialSignal(
      normalizedPrompt,
      [
        "multi site",
        "multiple locations",
        "portfolio",
      ]
    )
  ) {
    return "MULTI_SITE_BUSINESS";
  }

  if (
    includesCommercialSignal(
      normalizedPrompt,
      [
        "retail",
        "restaurant",
        "store locations",
      ]
    )
  ) {
    return "RETAIL";
  }

  if (
    includesCommercialSignal(
      normalizedPrompt,
      [
        "industrial",
        "warehouse",
        "manufacturing",
      ]
    )
  ) {
    return "INDUSTRIAL";
  }

  if (
    includesCommercialSignal(
      normalizedPrompt,
      [
        "government",
        "municipal",
        "county",
        "city contract",
      ]
    )
  ) {
    return "GOVERNMENT";
  }

  if (
    includesCommercialSignal(
      normalizedPrompt,
      [
        "commercial property owner",
        "building owner",
      ]
    )
  ) {
    return "COMMERCIAL_PROPERTY_OWNER";
  }

  return "GENERAL_COMMERCIAL";
}

function inferService(
  normalizedPrompt: string
) {
  const serviceSignals: Array<
    [string[], string]
  > = [
    [
      ["tree removal"],
      "Tree removal",
    ],
    [
      [
        "tree trimming",
        "tree pruning",
        "pruning",
      ],
      "Tree trimming and pruning",
    ],
    [
      ["stump grinding"],
      "Stump grinding",
    ],
    [
      ["plumbing"],
      "Commercial plumbing services",
    ],
    [
      [
        "hvac",
        "heating and cooling",
      ],
      "Commercial HVAC services",
    ],
    [
      ["septic"],
      "Commercial septic services",
    ],
    [
      [
        "maintenance agreement",
        "maintenance contract",
        "preventive maintenance",
      ],
      "Commercial maintenance services",
    ],
  ];

  for (
    const [signals, label]
    of serviceSignals
  ) {
    if (
      includesCommercialSignal(
        normalizedPrompt,
        signals
      )
    ) {
      return label;
    }
  }

  return null;
}

function inferNamedIncumbent(
  prompt: string
) {
  const match = prompt.match(
    /\b(?:replace|displace|take over from)\s+([A-Z][A-Za-z0-9&.' -]{2,80})\s+(?:at|for|with)\b/i
  );

  const candidate =
    cleanOrganizationName(match?.[1]);

  if (
    !candidate ||
    /^(?:the\s+)?current\s+(?:vendor|provider|contractor)$/i.test(
      candidate
    )
  ) {
    return null;
  }

  return candidate;
}

function inferObjective(params: {
  normalizedPrompt: string;
  targetAccountName: string | null;
}): {
  objective: CommercialOwnerObjective;
  matchedSignals: string[];
} {
  const {
    normalizedPrompt,
    targetAccountName,
  } = params;

  const hasNamedDisplacementPattern =
  /\b(?:replace|displace|take over from)\s+.+?\s+(?:at|for|with)\s+.+$/.test(
    normalizedPrompt
  );

  if (
  hasNamedDisplacementPattern ||
  includesCommercialSignal(
    normalizedPrompt,
    [
      "replace the current",
      "replace their current",
      "replace the incumbent",
      "take over from",
      "displace",
      "current vendor",
      "incumbent vendor",
      "current contractor",
      "current provider",
    ]
  )
) {
    return {
      objective:
        "INCUMBENT_DISPLACEMENT",

      matchedSignals: [
        "incumbent-vendor displacement language",
      ],
    };
  }

  if (
    includesCommercialSignal(
      normalizedPrompt,
      [
        "expand the account",
        "more work from",
        "already work with",
        "already handle",
        "already do",
        "already provide",
        "currently work with",
        "currently handle",
        "currently provide",
        "existing commercial customer",
        "existing commercial account",
        "we currently serve",
        "we already serve",
      ]
    )
  ) {
    return {
      objective:
        "ACCOUNT_EXPANSION",

      matchedSignals: [
        "existing-account expansion language",
      ],
    };
  }

  if (
    includesCommercialSignal(
      normalizedPrompt,
      [
        "win back",
        "reactivate",
        "past commercial customer",
        "past commercial account",
        "former commercial customer",
      ]
    )
  ) {
    return {
      objective:
        "COMMERCIAL_REACTIVATION",

      matchedSignals: [
        "past-account reactivation language",
      ],
    };
  }

  if (
    includesCommercialSignal(
      normalizedPrompt,
      [
        "maintenance agreement",
        "maintenance agreements",
        "maintenance contract",
        "maintenance contracts",
        "preventive maintenance",
      ]
    )
  ) {
    return {
      objective:
        "MAINTENANCE_AGREEMENT_GROWTH",

      matchedSignals: [
        "commercial maintenance-agreement language",
      ],
    };
  }

  if (
    includesCommercialSignal(
      normalizedPrompt,
      [
        "recurring commercial contract",
        "recurring commercial contracts",
        "recurring contract",
        "recurring contracts",
        "recurring revenue",
        "ongoing commercial work",
        "ongoing service relationship",
      ]
    )
  ) {
    return {
      objective:
        "RECURRING_CONTRACT_GROWTH",

      matchedSignals: [
        "recurring commercial revenue language",
      ],
    };
  }

  if (
    includesCommercialSignal(
      normalizedPrompt,
      [
        "approved vendor",
        "preferred vendor",
        "vendor relationship",
        "become a vendor",
        "backup vendor",
        "secondary vendor",
      ]
    )
  ) {
    return {
      objective:
        "VENDOR_RELATIONSHIP_DEVELOPMENT",

      matchedSignals: [
        "commercial vendor-relationship language",
      ],
    };
  }

  if (targetAccountName) {
    return {
      objective:
        "NAMED_ACCOUNT_PURSUIT",

      matchedSignals: [
        "named commercial account",
      ],
    };
  }

  if (
    includesCommercialSignal(
      normalizedPrompt,
      [
        "apartment complex",
        "apartment complexes",
        "apartment community",
        "property management",
        "facility manager",
        "hotels",
        "schools",
        "commercial accounts",
        "commercial customers",
      ]
    )
  ) {
    return {
      objective:
        "ACCOUNT_ACQUISITION",

      matchedSignals: [
        "commercial account-category acquisition language",
      ],
    };
  }

  return {
    objective:
      "GENERAL_COMMERCIAL_GROWTH",

    matchedSignals: [],
  };
}

function inferRelationship(
  objective: CommercialOwnerObjective
): {
  state: CommercialRelationshipState;
  goal: CommercialRelationshipGoal;
  revenueModel: CommercialRevenueModel;
} {
  switch (objective) {
    case "INCUMBENT_DISPLACEMENT":
      return {
        state: "INCUMBENT_PRESENT",
        goal: "INCUMBENT_REPLACEMENT",
        revenueModel:
          "VENDOR_RELATIONSHIP",
      };

    case "ACCOUNT_EXPANSION":
      return {
        state: "EXISTING_ACCOUNT",
        goal: "ACCOUNT_EXPANSION",
        revenueModel:
          "ACCOUNT_EXPANSION",
      };

    case "COMMERCIAL_REACTIVATION":
      return {
        state: "PAST_ACCOUNT",
        goal: "INTRODUCTION",
        revenueModel:
          "RECURRING_AND_PROJECT_WORK",
      };

    case "MAINTENANCE_AGREEMENT_GROWTH":
      return {
        state: "NEW_PROSPECT",
        goal: "MAINTENANCE_AGREEMENT",
        revenueModel:
          "MAINTENANCE_AGREEMENT",
      };

    case "RECURRING_CONTRACT_GROWTH":
      return {
        state: "NEW_PROSPECT",
        goal:
          "RECURRING_SERVICE_RELATIONSHIP",
        revenueModel:
          "RECURRING_SERVICE",
      };

    case "VENDOR_RELATIONSHIP_DEVELOPMENT":
      return {
        state: "NEW_PROSPECT",
        goal: "APPROVED_VENDOR",
        revenueModel:
          "VENDOR_RELATIONSHIP",
      };

    case "NAMED_ACCOUNT_PURSUIT":
    case "ACCOUNT_ACQUISITION":
      return {
        state: "NEW_PROSPECT",
        goal: "INTRODUCTION",
        revenueModel:
          "RECURRING_AND_PROJECT_WORK",
      };

    case "GENERAL_COMMERCIAL_GROWTH":
    default:
      return {
        state: "UNKNOWN",
        goal: "INTRODUCTION",
        revenueModel: "UNKNOWN",
      };
  }
}

function inferRequestedTimeframe(
  prompt: string
) {
  const timeframePatterns = [
    /\b(?:within|in|over)\s+(?:the\s+)?(?:next\s+)?(\d+\s+(?:day|days|week|weeks|month|months))\b/i,

    /\b(?:by|before)\s+([A-Za-z]+\s+\d{1,2}(?:,\s+\d{4})?)\b/i,

    /\b(this week|next week|this month|next month|this quarter|next quarter)\b/i,
  ];

  for (
    const pattern
    of timeframePatterns
  ) {
    const match =
      prompt.match(pattern);

    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

export function interpretCommercialIntent(
  prompt: string
): InterpretedCommercialIntent {
  const normalizedPrompt =
    normalizeCommercialPromptForMatching(
      prompt
    );

  const targetAccountName =
    extractTargetAccountName(prompt);

  const accountType =
    inferAccountType(
      normalizedPrompt
    );

  const objectiveResolution =
    inferObjective({
      normalizedPrompt,
      targetAccountName,
    });

  const relationship =
    inferRelationship(
      objectiveResolution.objective
    );

  const targetService =
    inferService(
      normalizedPrompt
    );

  const namedIncumbent =
    inferNamedIncumbent(prompt);

  const requestedTimeframe =
    inferRequestedTimeframe(prompt);

  const ownerProvidedFacts = [
    targetAccountName
      ? `Target account: ${targetAccountName}`
      : null,

    targetService
      ? `Target service: ${targetService}`
      : null,

    namedIncumbent
      ? `Named incumbent: ${namedIncumbent}`
      : null,

    requestedTimeframe
      ? `Requested timeframe: ${requestedTimeframe}`
      : null,

    objectiveResolution
      .matchedSignals.length > 0
      ? `Stated objective signal: ${objectiveResolution.matchedSignals.join(
          ", "
        )}`
      : null,
  ].filter(
    (
      value
    ): value is string =>
      Boolean(value)
  );

  const assumptions = [
    "The account's internal procurement process has not been verified.",

    "No dissatisfaction with an incumbent vendor is assumed unless the owner explicitly provided that fact.",
  ];

  const unknowns = [
    !targetAccountName
      ? "Specific target account or account list"
      : null,

    !targetService
      ? "Exact commercial service or service package to emphasize"
      : null,

    "Decision-maker identity and contact information",

    "Vendor onboarding requirements",

    "Final scope, pricing, service levels, and contractual terms",
  ].filter(
    (
      value
    ): value is string =>
      Boolean(value)
  );

  const result: InterpretedCommercialIntent = {
    market: "COMMERCIAL",

    ownerObjective:
      objectiveResolution.objective,

    confidence:
      targetAccountName ||
      objectiveResolution
        .matchedSignals.length > 0
        ? "HIGH"
        : accountType !==
            "GENERAL_COMMERCIAL"
          ? "MEDIUM"
          : "DEFAULT",

    matchedSignals:
      objectiveResolution.matchedSignals,

    targetAccountName,

    targetAccountType:
      targetAccountName &&
      accountType ===
        "GENERAL_COMMERCIAL"
        ? "NAMED_ORGANIZATION"
        : accountType,

    namedIncumbent,

    targetService,

    relationshipState:
      relationship.state,

    relationshipGoal:
      relationship.goal,

    revenueModel:
      relationship.revenueModel,

    buyingStage: "RESEARCH",

    requestedTimeframe,

    ownerProvidedFacts,

    assumptions,

    unknowns,
  };

  return interpretedCommercialIntentSchema.parse(
    result
  );
}