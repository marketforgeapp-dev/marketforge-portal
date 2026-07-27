"use client";

import {
  useState,
  useTransition,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  createCampaignFromPrompt,
  validateCampaignPrompt,
  type PromptReadinessResult,
} from "@/app/campaigns/actions";

import {
  createCommercialActionFromPrompt,
  validateCommercialActionPrompt,
} from "@/app/campaigns/commercial-actions";

import {
  SystemStatusOverlay,
} from "@/components/system/system-status-overlay";

type NlpMarket =
  | "RESIDENTIAL"
  | "COMMERCIAL";

const RESIDENTIAL_SUGGESTIONS = [
  "What is the best next action for my business right now?",
  "Slow week, help fill the schedule",
  "Should we focus on AEO / FAQ improvements first?",
  "Promote drain cleaning this week",
  "Promote tree trimming and pruning",
  "We need more riser installs",
  "Promote HVAC system installation with Trane rebates",
];

const COMMERCIAL_SUGGESTIONS = [
  "I want apartment complexes",
  "I want ABC Property Management",
  "I want recurring commercial contracts",
  "I want to replace the current plumbing vendor at Memorial Hospital",
  "I want more commercial maintenance agreements",
];

export function NlCampaignPanel() {
  const router =
    useRouter();

  const [
    market,
    setMarket,
  ] =
    useState<NlpMarket | null>(
      null
    );

  const [
    prompt,
    setPrompt,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  const [
    readinessIssue,
    setReadinessIssue,
  ] = useState<
    Exclude<
      PromptReadinessResult,
      { ready: true }
    > | null
  >(null);

  const [
    showGeneratingOverlay,
    setShowGeneratingOverlay,
  ] =
    useState(false);

  const [
    isPending,
    startTransition,
  ] =
    useTransition();

  const suggestions =
    market === "COMMERCIAL"
      ? COMMERCIAL_SUGGESTIONS
      : RESIDENTIAL_SUGGESTIONS;

  const promptPlaceholder =
    market === "COMMERCIAL"
      ? "Example: I want to win apartment complexes and recurring property-management work."
      : "Example: Should we push drain cleaning this week, or is improving local FAQ / AEO visibility a better move first?";

  function handleMarketChange(
    nextMarket: NlpMarket
  ) {
    setMarket(
      nextMarket
    );

    setPrompt("");
    setError(null);
    setReadinessIssue(null);
    setShowGeneratingOverlay(false);
  }

  function handleGenerate() {
    const submittedPrompt =
      prompt.trim();

    if (
      !market ||
      !submittedPrompt
    ) {
      return;
    }

    setError(null);
    setReadinessIssue(null);

    startTransition(
      async () => {
        try {
          if (
            market ===
            "COMMERCIAL"
          ) {
            const readiness =
              await validateCommercialActionPrompt(
                submittedPrompt
              );

            if (
              !readiness.ready
            ) {
              setReadinessIssue(
                readiness
              );

              setShowGeneratingOverlay(
                false
              );

              return;
            }

            setShowGeneratingOverlay(
              true
            );

            const result =
              await createCommercialActionFromPrompt(
                submittedPrompt
              );

            if (
              !result.success
            ) {
              if (
                "needsInput" in
                result
              ) {
                setReadinessIssue({
                  ready: false,
                  title:
                    result.title,
                  message:
                    result.message,
                  requirements:
                    result.requirements,
                  examplePrompt:
                    result.examplePrompt,
                });
              } else {
                setError(
                  result.error
                );
              }

              setShowGeneratingOverlay(
                false
              );

              return;
            }

            setPrompt("");

            router.push(
              `/campaigns/${result.campaignId}`
            );

            return;
          }

          const readiness =
            await validateCampaignPrompt(
              submittedPrompt
            );

          if (
            !readiness.ready
          ) {
            setReadinessIssue(
              readiness
            );

            setShowGeneratingOverlay(
              false
            );

            return;
          }

          setShowGeneratingOverlay(
            true
          );

          const result =
            await createCampaignFromPrompt(
              submittedPrompt
            );

          if (
            !result.success
          ) {
            if (
              "needsInput" in
              result
            ) {
              setReadinessIssue({
                ready: false,
                title:
                  result.title,
                message:
                  result.message,
                requirements:
                  result.requirements,
                examplePrompt:
                  result.examplePrompt,
              });
            } else if (
              "error" in result
            ) {
              setError(
                result.error
              );
            }

            setShowGeneratingOverlay(
              false
            );

            return;
          }

          setPrompt("");

          router.push(
            `/campaigns/${result.campaignId}`
          );
        } catch (error) {
          console.error(
            error
          );

          setError(
            "Unable to generate an action right now."
          );

          setShowGeneratingOverlay(
            false
          );
        }
      }
    );
  }

  return (
    <>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="mf-card rounded-3xl p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600">
            AI Action Prompt
          </p>

          <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
            What should MarketForge generate next?
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
            Choose the market first, then describe the business objective in
            plain English. MarketForge will generate the action and send you to
            the Action Detail page to review everything before execution.
          </p>

          <div className="mt-5">
            <p className="text-sm font-medium text-gray-900">
              Who are you trying to generate revenue from?
            </p>

            <div
              className="mt-2 grid gap-3 sm:grid-cols-2"
              role="radiogroup"
              aria-label="Action market"
            >
              <button
                type="button"
                role="radio"
                aria-checked={
                  market ===
                  "RESIDENTIAL"
                }
                onClick={() =>
                  handleMarketChange(
                    "RESIDENTIAL"
                  )
                }
                className={`rounded-2xl border px-4 py-4 text-left transition ${
                  market ===
                  "RESIDENTIAL"
                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <span className="block text-sm font-semibold text-gray-900">
                  Residential
                </span>

                <span className="mt-1 block text-sm leading-5 text-gray-600">
                  Homeowners and residential customers
                </span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={
                  market ===
                  "COMMERCIAL"
                }
                onClick={() =>
                  handleMarketChange(
                    "COMMERCIAL"
                  )
                }
                className={`rounded-2xl border px-4 py-4 text-left transition ${
                  market ===
                  "COMMERCIAL"
                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <span className="block text-sm font-semibold text-gray-900">
                  Commercial
                </span>

                <span className="mt-1 block text-sm leading-5 text-gray-600">
                  Businesses, properties, facilities, and organizations
                </span>
              </button>
            </div>
          </div>

          {market ? (
            <div className="mt-5">
              <label
                htmlFor="campaign-prompt"
                className="text-sm font-medium text-gray-900"
              >
                What do you want to accomplish?
              </label>

              <textarea
                id="campaign-prompt"
                value={prompt}
                onChange={(
                  event
                ) => {
                  setPrompt(
                    event.target
                      .value
                  );

                  setError(null);
                  setReadinessIssue(
                    null
                  );
                }}
                rows={6}
                placeholder={
                  promptPlaceholder
                }
                className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-600">
              Select Residential or Commercial to enter an action request.
            </div>
          )}

          {readinessIssue ? (
            <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4">
              <p className="text-sm font-semibold text-amber-950">
                {
                  readinessIssue.title
                }
              </p>

              <p className="mt-1 text-sm leading-6 text-amber-900">
                {
                  readinessIssue.message
                }
              </p>

              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">
                  Add these details to your prompt
                </p>

                <ul className="mt-2 space-y-1.5 text-sm text-amber-950">
                  {readinessIssue.requirements.map(
                    (
                      requirement
                    ) => (
                      <li
                        key={
                          requirement
                        }
                        className="flex gap-2"
                      >
                        <span aria-hidden="true">
                          •
                        </span>

                        <span>
                          {
                            requirement
                          }
                        </span>
                      </li>
                    )
                  )}
                </ul>
              </div>

              <div className="mt-4 rounded-xl border border-amber-200 bg-white px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                  Example
                </p>

                <p className="mt-1 text-sm leading-6 text-gray-700">
                  {
                    readinessIssue.examplePrompt
                  }
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setPrompt(
                      readinessIssue.examplePrompt
                    );

                    setReadinessIssue(
                      null
                    );

                    setError(null);
                  }}
                  className="mt-3 text-sm font-semibold text-blue-700 hover:text-blue-800"
                >
                  Use this example as my prompt
                </button>
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={
                handleGenerate
              }
              disabled={
                isPending ||
                !market ||
                !prompt.trim()
              }
              className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending
                ? "Generating..."
                : "Generate Action"}
            </button>

            <p className="text-sm text-gray-500">
              MarketForge will check your request before generating anything.
            </p>
          </div>
        </section>

        <aside className="mf-card rounded-3xl p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
            Prompt Ideas
          </p>

          {market ? (
            <div className="mt-4 space-y-3">
              {suggestions.map(
                (item) => (
                  <button
                    key={`aside-${item}`}
                    type="button"
                    onClick={() => {
                      setPrompt(
                        item
                      );

                      setError(null);
                      setReadinessIssue(
                        null
                      );
                    }}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    {item}
                  </button>
                )
              )}
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-gray-500">
              Prompt ideas will appear after you select a market.
            </p>
          )}
        </aside>
      </div>

      <SystemStatusOverlay
        mode="generating"
        visible={
          showGeneratingOverlay
        }
      />
    </>
  );
}