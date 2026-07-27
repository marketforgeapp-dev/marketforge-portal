import type {
  CommercialOwnerInputRequirement,
  CommercialOwnerInputValueMap,
  CommercialPursuitAssetPackage,
} from "@/lib/nlp/commercial/types";

function escapeRegExp(value: string) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

function normalizeRequirementKey(
  value: string
) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getRequirementValue(params: {
  requirement:
    CommercialOwnerInputRequirement;
  values:
    CommercialOwnerInputValueMap;
}) {
  return (
    params.values[
      params.requirement.key
    ] ??
    params.requirement.currentValue ??
    ""
  ).trim();
}

function replaceRequirementPlaceholder(params: {
  content: string;
  requirement:
    CommercialOwnerInputRequirement;
  value: string;
}) {
  const {
    requirement,
    value,
  } = params;

  if (!value) {
    return params.content;
  }

  let content =
    params.content;

  const labelPattern =
    escapeRegExp(
      requirement.label
    );

  const keyAsWords =
    requirement.key.replace(
      /_/g,
      " "
    );

  const keyPattern =
    escapeRegExp(
      keyAsWords
    );

  content = content.replace(
    new RegExp(
      `\\[OWNER INPUT REQUIRED:\\s*${labelPattern}\\s*\\]`,
      "gi"
    ),
    value
  );

  content = content.replace(
    new RegExp(
      `\\[OWNER INPUT REQUIRED:\\s*${keyPattern}\\s*\\]`,
      "gi"
    ),
    value
  );

  const normalizedKey =
    normalizeRequirementKey(
      requirement.key
    );

  if (
    [
      "sender_name",
      "owner_name",
      "contact_name",
      "primary_contact_name",
    ].includes(normalizedKey)
  ) {
    content = content.replace(
      /\[(?:YOUR|OWNER|SENDER) NAME\]/gi,
      value
    );
  }

  if (
    [
      "sender_email",
      "owner_email",
      "contact_email",
    ].includes(normalizedKey)
  ) {
    content = content.replace(
      /\[(?:YOUR|OWNER|SENDER) EMAIL\]/gi,
      value
    );
  }

  if (
    [
      "sender_phone",
      "owner_phone",
      "contact_phone",
    ].includes(normalizedKey)
  ) {
    content = content.replace(
      /\[(?:YOUR|OWNER|SENDER) PHONE(?: NUMBER)?\]/gi,
      value
    );
  }

  return content;
}

function hydrateContent(params: {
  content: string;
  requirements:
    CommercialOwnerInputRequirement[];
  values:
    CommercialOwnerInputValueMap;
}) {
  return params.requirements.reduce(
    (content, requirement) => {
      const value =
        getRequirementValue({
          requirement,
          values:
            params.values,
        });

      return replaceRequirementPlaceholder({
        content,
        requirement,
        value,
      });
    },
    params.content
  );
}

export function createCommercialOwnerInputValues(
  packageResult:
    CommercialPursuitAssetPackage
): CommercialOwnerInputValueMap {
  return Object.fromEntries(
    packageResult
      .ownerInputRequirements
      .map((requirement) => [
        requirement.key,
        requirement.currentValue ?? "",
      ])
  );
}

export function applyCommercialOwnerInputs(params: {
  packageResult:
    CommercialPursuitAssetPackage;
  values:
    CommercialOwnerInputValueMap;
}): CommercialPursuitAssetPackage {
  const {
    packageResult,
    values,
  } = params;

  const updatedRequirements =
    packageResult
      .ownerInputRequirements
      .map((requirement) => {
        const value =
          getRequirementValue({
            requirement,
            values,
          });

        return {
          ...requirement,
          currentValue:
            value || null,
        };
      });

  const requirementByKey =
    new Map(
      updatedRequirements.map(
        (requirement) => [
          requirement.key,
          requirement,
        ]
      )
    );

  const assets =
    packageResult.assets.map(
      (asset) => {
        const missingOwnerInputKeys =
          asset.requiredOwnerInputKeys.filter(
            (key) => {
              const requirement =
                requirementByKey.get(
                  key
                );

              if (!requirement) {
                return true;
              }

              return !getRequirementValue({
                requirement,
                values,
              });
            }
          );

        const sections =
          asset.sections.map(
            (section) => ({
              ...section,

              content:
                hydrateContent({
                  content:
                    section.content,

                  requirements:
                    updatedRequirements,

                  values,
                }),
            })
          );

        const usageInstructions =
          hydrateContent({
            content:
              asset.usageInstructions,

            requirements:
              updatedRequirements,

            values,
          });

        const completionSignal =
          hydrateContent({
            content:
              asset.completionSignal,

            requirements:
              updatedRequirements,

            values,
          });

        let readiness =
          asset.readiness;

        if (
          asset
            .requiredAccountDiscoveryItems
            .length > 0
        ) {
          readiness =
            "ACCOUNT_DISCOVERY_REQUIRED";
        } else if (
          missingOwnerInputKeys.length >
          0
        ) {
          readiness =
            "OWNER_INPUT_REQUIRED";
        } else if (
          asset.readiness ===
          "OWNER_INPUT_REQUIRED"
        ) {
          readiness =
            "READY_NOW";
        }

        return {
          ...asset,
          readiness,
          requiredOwnerInputKeys:
            missingOwnerInputKeys,
          sections,
          usageInstructions,
          completionSignal,
        };
      }
    );

  return {
    ...packageResult,

    assets,

    ownerInputRequirements:
      updatedRequirements,

    readyNowAssetIds:
      assets
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
      assets
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
      assets
        .filter(
          (asset) =>
            asset.readiness ===
            "ACCOUNT_DISCOVERY_REQUIRED"
        )
        .map(
          (asset) =>
            asset.id
        ),
  };
}