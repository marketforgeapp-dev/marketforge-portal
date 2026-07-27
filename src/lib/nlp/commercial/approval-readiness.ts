type CommercialAssetMetadata = {
  market?: string;
  commercialCategory?: string;
  commercialCategoryLabel?: string;
};

type CommercialOwnerInputRequirement = {
  key?: string;
  label?: string;
  requiredBefore?:
    | "INITIAL_OUTREACH"
    | "DISCOVERY"
    | "PROPOSAL"
    | "CONTRACT"
    | "ONBOARDING";
  currentValue?: string | null;
};

type CommercialBriefShape = {
  commercialActionSpec?: {
    ownerInputRequirements?: CommercialOwnerInputRequirement[];
  };
};

type CommercialApprovalAsset = {
  id: string;
  title: string | null;
  content: string;
  isApproved: boolean;
  metadataJson: unknown;
};

export type CommercialApprovalBlocker = {
  assetId: string;
  assetTitle: string;
  category: string;

  blockerTypes: Array<
    | "UNRESOLVED_OWNER_INPUT"
    | "NOT_APPROVED"
  >;

  outstandingItems: string[];
};

export type CommercialApprovalReadinessResult =
  | {
      ready: true;
      blockers: [];
    }
  | {
      ready: false;
      blockers: CommercialApprovalBlocker[];
    };

const LAUNCH_PHASE_CATEGORIES = new Set([
  "ACCOUNT_BRIEF",
  "CAPABILITY_STATEMENT",
  "INITIAL_OUTREACH",
  "PHONE_SCRIPT",
  "VOICEMAIL",
  "DIRECT_MESSAGE",
  "OFFICE_VISIT",
]);

function parseMetadata(
  value: unknown
): CommercialAssetMetadata | null {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  const metadata =
    value as Record<string, unknown>;

  if (
    metadata.market !== "COMMERCIAL" ||
    typeof metadata.commercialCategory !==
      "string"
  ) {
    return null;
  }

  return metadata as CommercialAssetMetadata;
}

function parseBrief(
  value: unknown
): CommercialBriefShape | null {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  return value as CommercialBriefShape;
}

function formatLabel(
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

function normalizeComparableValue(
  value: string
) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeOutstandingItem(
  value: string
) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.]+$/g, "");
}

function extractOwnerInputPlaceholders(
  content: string
) {
  const matches =
    content.matchAll(
      /\[OWNER INPUT REQUIRED:\s*([^\]]+)\]/gi
    );

  return Array.from(matches)
    .map((match) =>
      normalizeOutstandingItem(
        match[1] ?? ""
      )
    )
    .filter(Boolean);
}

function uniqueStrings(
  values: string[]
) {
  return Array.from(
    new Set(
      values
        .map(normalizeOutstandingItem)
        .filter(Boolean)
    )
  );
}

function findMatchingRequirement(params: {
  placeholder: string;
  requirements:
    CommercialOwnerInputRequirement[];
}) {
  const normalizedPlaceholder =
    normalizeComparableValue(
      params.placeholder
    );

  return params.requirements.find(
    (requirement) => {
      const normalizedLabel =
        normalizeComparableValue(
          requirement.label ?? ""
        );

      const normalizedKey =
        normalizeComparableValue(
          requirement.key ?? ""
        );

      return (
        normalizedPlaceholder ===
          normalizedLabel ||
        normalizedPlaceholder ===
          normalizedKey ||
        normalizedPlaceholder.includes(
          normalizedLabel
        ) ||
        normalizedLabel.includes(
          normalizedPlaceholder
        )
      );
    }
  );
}

export function evaluateCommercialApprovalReadiness(
  assets: CommercialApprovalAsset[],
  briefJson: unknown
): CommercialApprovalReadinessResult {
  const brief =
    parseBrief(
      briefJson
    );

  const requirements =
    brief?.commercialActionSpec
      ?.ownerInputRequirements ??
    [];

  const blockers =
    assets.flatMap(
      (
        asset
      ): CommercialApprovalBlocker[] => {
        const metadata =
          parseMetadata(
            asset.metadataJson
          );

        if (!metadata) {
          return [];
        }

        const category =
          metadata.commercialCategory ??
          "COMMERCIAL_ASSET";

        if (
          !LAUNCH_PHASE_CATEGORIES.has(
            category
          )
        ) {
          return [];
        }

        const visiblePlaceholders =
          extractOwnerInputPlaceholders(
            asset.content
          );

        const blockingPlaceholders =
          visiblePlaceholders.filter(
            (placeholder) => {
              const matchedRequirement =
                findMatchingRequirement({
                  placeholder,
                  requirements,
                });

              // Unknown placeholders remain blocking as a safety gate.
              if (!matchedRequirement) {
                return true;
              }

              // A supplied value no longer blocks.
              if (
                matchedRequirement
                  .currentValue
                  ?.trim()
              ) {
                return false;
              }

              // Only facts needed to begin outreach block action approval.
              return (
                matchedRequirement
                  .requiredBefore ===
                "INITIAL_OUTREACH"
              );
            }
          );

        const blockerTypes:
          CommercialApprovalBlocker["blockerTypes"] =
          [];

        if (
          blockingPlaceholders.length >
          0
        ) {
          blockerTypes.push(
            "UNRESOLVED_OWNER_INPUT"
          );
        }

        if (!asset.isApproved) {
          blockerTypes.push(
            "NOT_APPROVED"
          );
        }

        if (
          blockerTypes.length === 0
        ) {
          return [];
        }

        return [
          {
            assetId:
              asset.id,

            assetTitle:
              asset.title ??
              metadata
                .commercialCategoryLabel ??
              formatLabel(category),

            category:
              metadata
                .commercialCategoryLabel ??
              formatLabel(category),

            blockerTypes,

            outstandingItems:
              uniqueStrings(
                blockingPlaceholders
              ),
          },
        ];
      }
    );

  if (blockers.length === 0) {
    return {
      ready: true,
      blockers: [],
    };
  }

  return {
    ready: false,
    blockers,
  };
}