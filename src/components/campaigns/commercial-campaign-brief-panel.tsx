import type {
  CampaignStatus,
} from "@/generated/prisma";

type CommercialBriefShape = {
  userPrompt?: string;

  interpretedIntent?: {
    ownerObjective?: string;
    confidence?: string;
    targetAccountName?: string | null;
    targetAccountType?: string;
    namedIncumbent?: string | null;
    targetService?: string | null;
    relationshipState?: string;
    relationshipGoal?: string;
    revenueModel?: string;
    requestedTimeframe?: string | null;
    ownerProvidedFacts?: string[];
    assumptions?: string[];
    unknowns?: string[];
  };

  commercialActionSpec?: {
    actionType?: string;
    actionName?: string;
    actionSummary?: string;
    ownerObjective?: string;

    target?: {
      accountName?: string | null;
      accountType?: string;
      displayLabel?: string;
      namedIncumbent?: string | null;
      relationshipState?: string;
      relationshipGoal?: string;
    };

    targetService?: string | null;
    revenueModel?: string;
    launchMode?: string;
    primaryCallToAction?: string;
    expectedOutcome?: string;
    pursuitThesis?: string;

    executionTasks?: Array<{
      id?: string;
      sequence?: number;
      phase?: string;
      title?: string;
      description?: string;
      ownerAction?: string;
      marketForgeSupport?: string;
      completionSignal?: string;
      blockedByOwnerInputKeys?: string[];
    }>;

    ownerInputRequirements?: Array<{
      key?: string;
      label?: string;
      reason?: string;
      requiredBefore?: string;
      valueType?: string;
      currentValue?: string | null;
      example?: string;
    }>;

    readiness?: {
      readyNow?: string[];
      readyAfterOwnerCompletion?: string[];
      readyAfterAccountDiscovery?: string[];
      blockingOwnerInputKeys?: string[];
      proposalInputKeys?: string[];
      onboardingInputKeys?: string[];
    };

    assumptions?: string[];

    risks?: Array<{
      risk?: string;
      mitigation?: string;
    }>;

    successSignals?: string[];
  };

  commercialStrategy?: {
    executiveSummary?: string;
    desiredCommercialOutcome?: string;
    entryStrategy?: string;
    differentiationStrategy?: string;
    incumbentStrategy?: string | null;

    accountResearchPriorities?: string[];

    likelyStakeholders?: Array<{
      role?: string;
      influence?: string;
      likelyPriority?: string;
      engagementGoal?: string;
    }>;

    positioningPillars?: Array<{
      title?: string;
      message?: string;
      proofNeeded?: string[];
    }>;

    discoveryObjectives?: string[];
    qualificationCriteria?: string[];
    proposalPriorities?: string[];
    objectionThemes?: string[];
  };

  commercialAssetPackage?: {
    assetCount?: number;
    readyNowAssetIds?: string[];
    ownerInputRequiredAssetIds?: string[];
    accountDiscoveryRequiredAssetIds?: string[];
    unresolvedAccountDiscoveryItems?: string[];
  };
};

type Props = {
  status: CampaignStatus;
  campaignName: string;
  briefJson: unknown;
};

function parseCommercialBrief(
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
  value?: string | null
) {
  if (!value) {
    return "Not recorded";
  }

  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    );
}

function DetailCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
        {label}
      </p>

      <p className="mt-2 text-sm font-semibold leading-6 text-gray-900">
        {value}
      </p>
    </div>
  );
}

function BulletList({
  items,
  emptyLabel = "Nothing recorded",
}: {
  items?: string[];
  emptyLabel?: string;
}) {
  if (!items?.length) {
    return (
      <p className="text-sm text-gray-500">
        {emptyLabel}
      </p>
    );
  }

  return (
    <ul className="space-y-2 text-sm leading-6 text-gray-700">
      {items.map((item) => (
        <li
          key={item}
          className="flex gap-2"
        >
          <span aria-hidden="true">
            •
          </span>

          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function CommercialCampaignBriefPanel({
  status,
  campaignName,
  briefJson,
}: Props) {
  const brief =
    parseCommercialBrief(
      briefJson
    );

  const actionSpec =
    brief?.commercialActionSpec;

  const intent =
    brief?.interpretedIntent;

  const strategy =
    brief?.commercialStrategy;

  const assetPackage =
    brief?.commercialAssetPackage;

  const targetLabel =
    actionSpec?.target
      ?.displayLabel ??
    intent?.targetAccountName ??
    formatLabel(
      intent?.targetAccountType
    );

  const ownerRequirements =
    actionSpec
      ?.ownerInputRequirements ??
    [];

  const incompleteOwnerRequirements =
    ownerRequirements.filter(
      (requirement) =>
        !requirement.currentValue
    );

  const executionTasks =
    [...(
      actionSpec
        ?.executionTasks ??
      []
    )].sort(
      (left, right) =>
        (left.sequence ?? 0) -
        (right.sequence ?? 0)
    );

  const isLocked =
    status === "LAUNCHED" ||
    status === "COMPLETED";

  return (
    <section className="mf-card rounded-3xl p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600">
            Commercial Action Details
          </p>

          <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
            {actionSpec?.actionName ??
              campaignName}
          </h2>

          <p className="mt-2 max-w-4xl text-sm leading-6 text-gray-600">
            {actionSpec?.actionSummary ??
              strategy?.executiveSummary ??
              "Review the account pursuit, readiness requirements, and execution plan."}
          </p>
        </div>

        <span className="inline-flex rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">
          {isLocked
            ? "Execution Locked"
            : "Editable Before Launch"}
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DetailCard
          label="Target Account"
          value={targetLabel}
        />

        <DetailCard
          label="Commercial Objective"
          value={formatLabel(
            actionSpec?.ownerObjective ??
              intent?.ownerObjective
          )}
        />

        <DetailCard
          label="Relationship Goal"
          value={formatLabel(
            actionSpec?.target
              ?.relationshipGoal ??
              intent?.relationshipGoal
          )}
        />

        <DetailCard
          label="Launch Mode"
          value={formatLabel(
            actionSpec?.launchMode
          )}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
              Expected Commercial Outcome
            </p>

            <p className="mt-3 text-base font-semibold leading-7 text-gray-900">
              {actionSpec?.expectedOutcome ??
                strategy?.desiredCommercialOutcome ??
                "Advance the account toward a qualified commercial relationship."}
            </p>

            <p className="mt-4 text-sm font-semibold text-gray-900">
              Primary next step
            </p>

            <p className="mt-1 text-sm leading-6 text-gray-700">
              {actionSpec?.primaryCallToAction ??
                "Begin the Commercial pursuit."}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
              Pursuit Thesis
            </p>

            <p className="mt-3 text-sm leading-7 text-gray-700">
              {actionSpec?.pursuitThesis ??
                "No pursuit thesis recorded."}
            </p>

            {strategy?.entryStrategy ? (
              <>
                <p className="mt-4 text-sm font-semibold text-gray-900">
                  Entry strategy
                </p>

                <p className="mt-1 text-sm leading-7 text-gray-700">
                  {
                    strategy.entryStrategy
                  }
                </p>
              </>
            ) : null}

            {strategy
              ?.differentiationStrategy ? (
              <>
                <p className="mt-4 text-sm font-semibold text-gray-900">
                  Differentiation
                </p>

                <p className="mt-1 text-sm leading-7 text-gray-700">
                  {
                    strategy
                      .differentiationStrategy
                  }
                </p>
              </>
            ) : null}

            {strategy
              ?.incumbentStrategy ? (
              <>
                <p className="mt-4 text-sm font-semibold text-gray-900">
                  Incumbent strategy
                </p>

                <p className="mt-1 text-sm leading-7 text-gray-700">
                  {
                    strategy
                      .incumbentStrategy
                  }
                </p>
              </>
            ) : null}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
              Execution Plan
            </p>

            <div className="mt-4 space-y-4">
              {executionTasks.length >
              0 ? (
                executionTasks.map(
                  (task) => (
                    <div
                      key={
                        task.id ??
                        `${task.sequence}-${task.title}`
                      }
                      className="rounded-2xl border border-gray-200 bg-white p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          Step{" "}
                          {task.sequence ??
                            "—"}
                        </span>

                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                          {formatLabel(
                            task.phase
                          )}
                        </span>
                      </div>

                      <h3 className="mt-3 text-base font-semibold text-gray-900">
                        {task.title ??
                          "Commercial pursuit step"}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-gray-700">
                        {
                          task.description
                        }
                      </p>

                      <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        <div className="rounded-xl bg-gray-50 p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                            Owner Action
                          </p>

                          <p className="mt-1 text-sm leading-6 text-gray-700">
                            {task.ownerAction ??
                              "No owner action recorded."}
                          </p>
                        </div>

                        <div className="rounded-xl bg-gray-50 p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                            MarketForge Support
                          </p>

                          <p className="mt-1 text-sm leading-6 text-gray-700">
                            {task.marketForgeSupport ??
                              "No support material recorded."}
                          </p>
                        </div>
                      </div>

                      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Complete when
                      </p>

                      <p className="mt-1 text-sm leading-6 text-gray-700">
                        {task.completionSignal ??
                          "The agreed next step is complete."}
                      </p>
                    </div>
                  )
                )
              ) : (
                <p className="text-sm text-gray-500">
                  No execution tasks recorded.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
              Readiness
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                  Ready Now
                </p>

                <p className="mt-2 text-2xl font-bold text-emerald-950">
                  {assetPackage
                    ?.readyNowAssetIds
                    ?.length ?? 0}
                </p>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                  Owner Input
                </p>

                <p className="mt-2 text-2xl font-bold text-amber-950">
                  {assetPackage
                    ?.ownerInputRequiredAssetIds
                    ?.length ?? 0}
                </p>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">
                  Account Discovery
                </p>

                <p className="mt-2 text-2xl font-bold text-blue-950">
                  {assetPackage
                    ?.accountDiscoveryRequiredAssetIds
                    ?.length ?? 0}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
              Owner Inputs Still Needed
            </p>

            <div className="mt-4 space-y-3">
              {incompleteOwnerRequirements
                .length > 0 ? (
                incompleteOwnerRequirements.map(
                  (requirement) => (
                    <div
                      key={
                        requirement.key ??
                        requirement.label
                      }
                      className="rounded-xl border border-gray-200 bg-white p-4"
                    >
                      <p className="text-sm font-semibold text-gray-900">
                        {requirement.label ??
                          formatLabel(
                            requirement.key
                          )}
                      </p>

                      <p className="mt-1 text-sm leading-6 text-gray-600">
                        {
                          requirement.reason
                        }
                      </p>

                      <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                        Required before{" "}
                        {formatLabel(
                          requirement
                            .requiredBefore
                        )}
                      </p>
                    </div>
                  )
                )
              ) : (
                <p className="text-sm text-emerald-700">
                  No unresolved owner-input requirements are recorded.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
              Account Discovery Still Needed
            </p>

            <div className="mt-4">
              <BulletList
                items={
                  assetPackage
                    ?.unresolvedAccountDiscoveryItems
                }
                emptyLabel="No unresolved account-discovery items recorded."
              />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
              Risks and Guardrails
            </p>

            <div className="mt-4 space-y-3">
              {actionSpec?.risks
                ?.length ? (
                actionSpec.risks.map(
                  (risk, index) => (
                    <div
                      key={`${risk.risk}-${index}`}
                      className="rounded-xl border border-gray-200 bg-white p-4"
                    >
                      <p className="text-sm font-semibold text-gray-900">
                        {risk.risk}
                      </p>

                      <p className="mt-2 text-sm leading-6 text-gray-600">
                        {risk.mitigation}
                      </p>
                    </div>
                  )
                )
              ) : (
                <p className="text-sm text-gray-500">
                  No risks recorded.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
              Success Signals
            </p>

            <div className="mt-4">
              <BulletList
                items={
                  actionSpec
                    ?.successSignals
                }
              />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
              Original Owner Request
            </p>

            <p className="mt-3 text-sm leading-7 text-gray-700">
              {brief?.userPrompt ??
                "Not recorded"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}