import type {
  Prisma,
} from "@/generated/prisma";

export type VendorReadinessStatus =
  | "AVAILABLE"
  | "NEEDS_PREPARATION"
  | "NOT_APPLICABLE";

export type CommercialReusableInputs = {
  sender: {
    name: string;
    title: string;
    email: string;
    phone: string;
  };

  targetAccount: {
    accountName: string;
    contactName: string;
    contactTitle: string;
    contactEmail: string;
    contactPhone: string;
  };

  capabilities: {
    selectedServices: string[];
    serviceArea: string;
    capacityStatement: string;
    commercialExperience: string;
    referenceSummary: string;
    availabilityModel: string;
    differentiators: string;
  };
};

export type CommercialVendorReadinessItem = {
  status: VendorReadinessStatus;
  notes: string;
};

export type CommercialVendorReadiness = {
  w9: CommercialVendorReadinessItem;
  insurance: CommercialVendorReadinessItem;
  businessLicense: CommercialVendorReadinessItem;
  references: CommercialVendorReadinessItem;
  safetyDocumentation: CommercialVendorReadinessItem;
  pricingSheet: CommercialVendorReadinessItem;
};

type CommercialOwnerInputRequirement = {
  key?: string;
  label?: string;
  reason?: string;
  requiredBefore?:
    | "INITIAL_OUTREACH"
    | "DISCOVERY"
    | "PROPOSAL"
    | "CONTRACT"
    | "ONBOARDING";
  valueType?: string;
  currentValue?: string | null;
  example?: string;
};

type CommercialAssetMetadata = {
  market?: string;
  commercialAssetId?: string;
  commercialCategory?: string;
  commercialCategoryLabel?: string;
  readiness?:
    | "READY_NOW"
    | "OWNER_INPUT_REQUIRED"
    | "ACCOUNT_DISCOVERY_REQUIRED";
  requiredOwnerInputKeys?: string[];
  requiredAccountDiscoveryItems?: string[];
  [key: string]: unknown;
};

type CommercialBrief = {
  market?: string;

  interpretedIntent?: {
    targetAccountName?: string | null;
    [key: string]: unknown;
  };

  commercialActionSpec?: {
    target?: {
      accountName?: string | null;
      displayLabel?: string;
      [key: string]: unknown;
    };

    ownerInputRequirements?:
      CommercialOwnerInputRequirement[];

    readiness?: {
      blockingOwnerInputKeys?: string[];
      proposalInputKeys?: string[];
      onboardingInputKeys?: string[];
      [key: string]: unknown;
    };

    [key: string]: unknown;
  };

  commercialAssetPackage?: {
    readyNowAssetIds?: string[];
    ownerInputRequiredAssetIds?: string[];
    accountDiscoveryRequiredAssetIds?: string[];
    ownerInputRequirements?:
      CommercialOwnerInputRequirement[];
    [key: string]: unknown;
  };

  commercialReusableInputs?:
    CommercialReusableInputs;

  commercialVendorReadiness?:
    CommercialVendorReadiness;

  actionThesis?: {
    audience?: string;
    [key: string]: unknown;
  };

  campaignDraft?: {
    audience?: string;
    [key: string]: unknown;
  };

  [key: string]: unknown;
};

export type PersistedCommercialAssetInput = {
  id: string;
  content: string;
  metadataJson:
    Prisma.JsonValue | null;
};

export type UpdatedCommercialAsset = {
  id: string;
  content: string;
  metadataJson:
    Prisma.InputJsonValue;
  commercialAssetId: string;
  readiness:
    | "READY_NOW"
    | "OWNER_INPUT_REQUIRED"
    | "ACCOUNT_DISCOVERY_REQUIRED";
};

export type ApplyCommercialReusableInputsParams = {
  briefJson:
    Prisma.JsonValue | null;

  assets:
    PersistedCommercialAssetInput[];

  reusableInputs:
    CommercialReusableInputs;

  vendorReadiness:
    CommercialVendorReadiness;
};

const DOCUMENT_REQUIREMENT_SIGNALS = [
  "w9",
  "w_9",
  "insurance",
  "certificate_of_insurance",
  "proof_of_insurance",
  "business_license",
  "license_document",
  "safety_document",
  "safety_program",
  "pricing_sheet",
  "pricing_structure",
];

function toJsonInput(
  value: unknown
): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(value)
  ) as Prisma.InputJsonValue;
}

function parseBrief(
  value:
    Prisma.JsonValue | null
): CommercialBrief {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  return value as CommercialBrief;
}

function parseMetadata(
  value:
    Prisma.JsonValue | null
): CommercialAssetMetadata {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  return value as CommercialAssetMetadata;
}

function normalizeKey(
  value: string
) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function uniqueStrings(
  values: string[]
) {
  return Array.from(
    new Set(
      values
        .map((value) =>
          value.trim()
        )
        .filter(Boolean)
    )
  );
}

function isDocumentRequirement(
  requirement:
    CommercialOwnerInputRequirement
) {
  const comparable =
    normalizeKey(
      [
        requirement.key,
        requirement.label,
      ]
        .filter(Boolean)
        .join(" ")
    );

  return DOCUMENT_REQUIREMENT_SIGNALS.some(
    (signal) =>
      comparable.includes(
        normalizeKey(signal)
      )
  );
}

function reusableValueByRequirementKey(
  requirement:
    CommercialOwnerInputRequirement,
  inputs:
    CommercialReusableInputs
) {
  const key =
    normalizeKey(
      requirement.key ??
        requirement.label ??
        ""
    );

  if (
    key.includes("sender_name") ||
    key.includes("owner_name") ||
    key.includes("sales_contact_name")
  ) {
    return inputs.sender.name;
  }

  if (
    key.includes("sender_title") ||
    key.includes("owner_title") ||
    key.includes("sales_contact_title")
  ) {
    return inputs.sender.title;
  }

  if (
    key.includes("sender_email") ||
    key.includes("owner_email") ||
    key.includes("sales_contact_email")
  ) {
    return inputs.sender.email;
  }

  if (
    key.includes("sender_phone") ||
    key.includes("owner_phone") ||
    key.includes("sales_contact_phone")
  ) {
    return inputs.sender.phone;
  }

  if (
    key.includes("target_account") ||
    key.includes("account_name") ||
    key.includes("business_name")
  ) {
    return inputs.targetAccount
      .accountName;
  }

  if (
    key.includes("target_contact_name") ||
    key.includes("decision_maker_name") ||
    key.includes("recipient_name")
  ) {
    return inputs.targetAccount
      .contactName;
  }

  if (
    key.includes("target_contact_title") ||
    key.includes("decision_maker_title") ||
    key.includes("recipient_title")
  ) {
    return inputs.targetAccount
      .contactTitle;
  }

  if (
    key.includes("target_contact_email") ||
    key.includes("recipient_email")
  ) {
    return inputs.targetAccount
      .contactEmail;
  }

  if (
    key.includes("target_contact_phone") ||
    key.includes("recipient_phone")
  ) {
    return inputs.targetAccount
      .contactPhone;
  }

  if (
    key.includes("service_area") ||
    key.includes("coverage_area")
  ) {
    return inputs.capabilities
      .serviceArea;
  }

  if (
    key.includes("verified_service") ||
    key.includes("commercial_service") ||
    key.includes("service_category") ||
    key.includes("capabilities")
  ) {
    return inputs.capabilities
      .selectedServices
      .join(", ");
  }

  if (
    key.includes("capacity") ||
    key.includes("coverage_statement")
  ) {
    return inputs.capabilities
      .capacityStatement;
  }

  if (
    key.includes("commercial_experience") ||
    key.includes("experience_summary")
  ) {
    return inputs.capabilities
      .commercialExperience;
  }

  if (
    key.includes("reference_summary") ||
    key.includes("approved_reference")
  ) {
    return inputs.capabilities
      .referenceSummary;
  }

  if (
    key.includes("availability") ||
    key.includes("response_model") ||
    key.includes("emergency_coverage")
  ) {
    return inputs.capabilities
      .availabilityModel;
  }

  if (
    key.includes("differentiator") ||
    key.includes("value_proposition")
  ) {
    return inputs.capabilities
      .differentiators;
  }

  return "";
}

function replacePattern(
  content: string,
  pattern: RegExp,
  value: string
) {
  return value.trim()
    ? content.replace(
        pattern,
        value.trim()
      )
    : content;
}

function applyDirectPlaceholders(
  content: string,
  inputs:
    CommercialReusableInputs
) {
  let result =
    content;

  result = replacePattern(
    result,
    /\[(?:YOUR|OWNER|SENDER) NAME\]/gi,
    inputs.sender.name
  );

  result = replacePattern(
    result,
    /\[(?:YOUR|OWNER|SENDER) TITLE\]/gi,
    inputs.sender.title
  );

  result = replacePattern(
    result,
    /\[(?:YOUR|OWNER|SENDER) EMAIL\]/gi,
    inputs.sender.email
  );

  result = replacePattern(
    result,
    /\[(?:YOUR|OWNER|SENDER) PHONE(?: NUMBER)?\]/gi,
    inputs.sender.phone
  );

  result = replacePattern(
    result,
    /\[(?:TARGET )?(?:ACCOUNT|BUSINESS|COMPANY) NAME\]/gi,
    inputs.targetAccount
      .accountName
  );

  result = replacePattern(
    result,
    /\[(?:TARGET )?(?:CONTACT|RECIPIENT|DECISION MAKER) NAME\]/gi,
    inputs.targetAccount
      .contactName
  );

  result = replacePattern(
    result,
    /\[(?:TARGET )?(?:CONTACT|RECIPIENT|DECISION MAKER) (?:TITLE|ROLE)\]/gi,
    inputs.targetAccount
      .contactTitle
  );

  result = replacePattern(
    result,
    /\[(?:TARGET )?(?:CONTACT|RECIPIENT) EMAIL\]/gi,
    inputs.targetAccount
      .contactEmail
  );

  result = replacePattern(
    result,
    /\[(?:TARGET )?(?:CONTACT|RECIPIENT) PHONE(?: NUMBER)?\]/gi,
    inputs.targetAccount
      .contactPhone
  );

  result = replacePattern(
    result,
    /\[(?:VERIFIED )?(?:COMMERCIAL )?SERVICES?\]/gi,
    inputs.capabilities
      .selectedServices
      .join(", ")
  );

  result = replacePattern(
    result,
    /\[SERVICE CATEGORY\]/gi,
    inputs.capabilities
      .selectedServices
      .join(", ")
  );

  result = replacePattern(
    result,
    /\[(?:SERVICE|COVERAGE) AREA\]/gi,
    inputs.capabilities
      .serviceArea
  );

  return result;
}

function replaceStructuredOwnerPlaceholders(
  content: string,
  requirements:
    CommercialOwnerInputRequirement[],
  inputs:
    CommercialReusableInputs
) {
  return content.replace(
    /\[OWNER INPUT REQUIRED:\s*([^\]]+)\]/gi,
    (
      fullMatch,
      placeholder:
        string
    ) => {
      const normalizedPlaceholder =
        normalizeKey(
          placeholder
        );

      const requirement =
        requirements.find(
          (candidate) => {
            const candidateKey =
              normalizeKey(
                candidate.key ??
                  ""
              );

            const candidateLabel =
              normalizeKey(
                candidate.label ??
                  ""
              );

            return (
              normalizedPlaceholder ===
                candidateKey ||
              normalizedPlaceholder ===
                candidateLabel ||
              (
                candidateKey &&
                normalizedPlaceholder.includes(
                  candidateKey
                )
              ) ||
              (
                candidateLabel &&
                normalizedPlaceholder.includes(
                  candidateLabel
                )
              )
            );
          }
        );

      if (
        !requirement ||
        isDocumentRequirement(
          requirement
        )
      ) {
        return fullMatch;
      }

      const value =
        reusableValueByRequirementKey(
          requirement,
          inputs
        );

      return value.trim()
        ? value.trim()
        : fullMatch;
    }
  );
}

function hasOwnerInputPlaceholder(
  content: string
) {
  return /\[OWNER INPUT REQUIRED:\s*[^\]]+\]/i.test(
    content
  );
}

function updateLegacyRequirements(
  requirements:
    CommercialOwnerInputRequirement[],
  inputs:
    CommercialReusableInputs
) {
  return requirements.map(
    (requirement) => {
      if (
        isDocumentRequirement(
          requirement
        )
      ) {
        return requirement;
      }

      const value =
        reusableValueByRequirementKey(
          requirement,
          inputs
        );

      return value.trim()
        ? {
            ...requirement,
            currentValue:
              value.trim(),
          }
        : requirement;
    }
  );
}

export function applyPersistedCommercialReusableInputs(
  params:
    ApplyCommercialReusableInputsParams
) {
  const brief =
    parseBrief(
      params.briefJson
    );

  if (
    brief.market !==
    "COMMERCIAL"
  ) {
    throw new Error(
      "This action is not a Commercial action."
    );
  }

  const existingRequirements =
    brief
      .commercialActionSpec
      ?.ownerInputRequirements ??
    brief
      .commercialAssetPackage
      ?.ownerInputRequirements ??
    [];

  const updatedRequirements =
    updateLegacyRequirements(
      existingRequirements,
      params.reusableInputs
    );

  const requirementByKey =
    new Map(
      updatedRequirements.map(
        (requirement) => [
          normalizeKey(
            requirement.key ??
              ""
          ),
          requirement,
        ]
      )
    );

  const updatedAssets:
    UpdatedCommercialAsset[] =
    params.assets.map(
      (asset) => {
        const metadata =
          parseMetadata(
            asset.metadataJson
          );

        let content =
          applyDirectPlaceholders(
            asset.content,
            params.reusableInputs
          );

        content =
          replaceStructuredOwnerPlaceholders(
            content,
            updatedRequirements,
            params.reusableInputs
          );

        const remainingOwnerInputKeys =
          (
            metadata
              .requiredOwnerInputKeys ??
            []
          ).filter(
            (key) => {
              const requirement =
                requirementByKey.get(
                  normalizeKey(key)
                );

              if (
                !requirement
              ) {
                return true;
              }

              if (
                isDocumentRequirement(
                  requirement
                )
              ) {
                return false;
              }

              return !requirement
                .currentValue
                ?.trim();
            }
          );

        const accountDiscoveryItems =
          metadata
            .requiredAccountDiscoveryItems ??
          [];

        let readiness:
          UpdatedCommercialAsset["readiness"];

        if (
          accountDiscoveryItems.length >
          0
        ) {
          readiness =
            "ACCOUNT_DISCOVERY_REQUIRED";
        } else if (
          remainingOwnerInputKeys.length >
            0 ||
          hasOwnerInputPlaceholder(
            content
          )
        ) {
          readiness =
            "OWNER_INPUT_REQUIRED";
        } else {
          readiness =
            "READY_NOW";
        }

        const commercialAssetId =
          metadata
            .commercialAssetId ??
          asset.id;

        return {
          id:
            asset.id,

          content,

          commercialAssetId,

          readiness,

          metadataJson:
            toJsonInput({
              ...metadata,
              readiness,
              requiredOwnerInputKeys:
                remainingOwnerInputKeys,
            }),
        };
      }
    );

  const readyNowAssetIds =
    updatedAssets
      .filter(
        (asset) =>
          asset.readiness ===
          "READY_NOW"
      )
      .map(
        (asset) =>
          asset.commercialAssetId
      );

  const ownerInputRequiredAssetIds =
    updatedAssets
      .filter(
        (asset) =>
          asset.readiness ===
          "OWNER_INPUT_REQUIRED"
      )
      .map(
        (asset) =>
          asset.commercialAssetId
      );

  const accountDiscoveryRequiredAssetIds =
    updatedAssets
      .filter(
        (asset) =>
          asset.readiness ===
          "ACCOUNT_DISCOVERY_REQUIRED"
      )
      .map(
        (asset) =>
          asset.commercialAssetId
      );

  const accountName =
    params.reusableInputs
      .targetAccount
      .accountName
      .trim();

  const currentActionSpec =
    brief
      .commercialActionSpec ??
    {};

  const currentTarget =
    currentActionSpec.target &&
    typeof currentActionSpec.target ===
      "object" &&
    !Array.isArray(
      currentActionSpec.target
    )
      ? currentActionSpec.target
      : {};

  const updatedBriefJson =
    toJsonInput({
      ...brief,

      commercialReusableInputs:
        params.reusableInputs,

      commercialVendorReadiness:
        params.vendorReadiness,

      interpretedIntent: {
        ...(
          brief.interpretedIntent ??
          {}
        ),

        ...(accountName
          ? {
              targetAccountName:
                accountName,
            }
          : {}),
      },

      commercialActionSpec: {
        ...currentActionSpec,

        ownerInputRequirements:
          updatedRequirements,

        target: {
          ...currentTarget,

          ...(accountName
            ? {
                accountName,
                displayLabel:
                  accountName,
              }
            : {}),
        },
      },

      commercialAssetPackage: {
        ...(
          brief
            .commercialAssetPackage ??
          {}
        ),

        ownerInputRequirements:
          updatedRequirements,

        readyNowAssetIds,

        ownerInputRequiredAssetIds,

        accountDiscoveryRequiredAssetIds,
      },

      actionThesis: {
        ...(
          brief.actionThesis ??
          {}
        ),

        ...(accountName
          ? {
              audience:
                accountName,
            }
          : {}),
      },

      campaignDraft: {
        ...(
          brief.campaignDraft ??
          {}
        ),

        ...(accountName
          ? {
              audience:
                accountName,
            }
          : {}),
      },
    });

  const remainingReusableInputCount =
    [
      params.reusableInputs
        .sender.name,

      params.reusableInputs
        .targetAccount
        .accountName,

      params.reusableInputs
        .capabilities
        .selectedServices.length >
      0
        ? "complete"
        : "",

      params.reusableInputs
        .capabilities
        .capacityStatement,
    ].filter(
      (value) =>
        !value ||
        !String(value).trim()
    ).length;

  return {
    briefJson:
      updatedBriefJson,

    assets:
      updatedAssets,

    campaignAudience:
      accountName || null,

    remainingReusableInputCount,

    requirements:
      updatedRequirements,
  };
}