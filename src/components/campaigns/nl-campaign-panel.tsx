"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCampaignFromPrompt } from "@/app/campaigns/actions";

const SUGGESTIONS = [
  "What is the best next action for this plumbing business right now?",
  "Slow week, help fill the schedule",
  "Should we focus on AEO / FAQ improvements first?",
  "Promote drain cleaning this week",
  "We need more water heater installs",
  "Promote emergency plumbing services",
];

export function NlCampaignPanel() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    setError(null);

    startTransition(async () => {
      const submittedPrompt = prompt.trim();
      const result = await createCampaignFromPrompt(submittedPrompt);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setPrompt("");
      router.push(`/campaigns/${result.campaignId}`);
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="mf-card rounded-3xl p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600">
          AI Action Prompt
        </p>

        <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
          What should MarketForge generate next?
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
          Enter a plain-English request. MarketForge will resolve the best-fit
          opportunity, generate the action, and send you to the Action Detail
          page to review everything before it moves into execution.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {SUGGESTIONS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setPrompt(item)}
              className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
            >
              {item}
            </button>
          ))}
        </div>

        <div className="mt-5">
          <label
            htmlFor="campaign-prompt"
            className="text-sm font-medium text-gray-900"
          >
            Action request
          </label>

          <textarea
            id="campaign-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={6}
            placeholder="Example: Should we push drain cleaning this week, or is improving local FAQ / AEO visibility a better move first?"
            className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-gray-500">
            MarketForge may generate a direct-response action, a schedule-fill
            move, or an AEO / visibility package based on current intelligence.
          </p>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isPending || prompt.trim().length < 10}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Generating Action..." : "Generate Action"}
          </button>
        </div>
      </section>

      <aside className="space-y-5">
        <section className="mf-card rounded-3xl p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
            How It Works
          </p>

          <div className="mt-3 space-y-2.5">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                1. Opportunity Resolution
              </p>
              <p className="mt-1 text-sm leading-5 text-gray-700">
                MarketForge evaluates the request against live opportunity
                intelligence before generating anything.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                2. Action Generation
              </p>
              <p className="mt-1 text-sm leading-5 text-gray-700">
                The system creates a launch-ready action package tied to the
                selected opportunity.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                3. Action Detail Review
              </p>
              <p className="mt-1 text-sm leading-5 text-gray-700">
                You will be taken to the Action Detail page to review, approve,
                and move the work into execution.
              </p>
            </div>
          </div>
        </section>

        <section className="mf-card rounded-3xl p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
            Best Prompt Types
          </p>

          <div className="mt-3 space-y-2.5 text-sm leading-5 text-gray-700">
            <p className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
              “We need to fill the schedule next week.”
            </p>
            <p className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
              “Promote drain cleaning this week.”
            </p>
            <p className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
              “Should we prioritize AEO improvements or direct demand first?”
            </p>
            <p className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
              “We want more water heater installs.”
            </p>
          </div>
        </section>
      </aside>
    </div>
  );
}