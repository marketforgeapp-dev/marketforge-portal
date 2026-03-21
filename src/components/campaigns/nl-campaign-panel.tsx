"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCampaignFromPrompt } from "@/app/campaigns/actions";
import { SystemStatusOverlay } from "@/components/system/system-status-overlay";

const SUGGESTIONS = [
  "What is the best next action for my business right now?",
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
  const [showGeneratingOverlay, setShowGeneratingOverlay] = useState(false);
  const [isPending, startTransition] = useTransition();

    function handleGenerate() {
    const submittedPrompt = prompt.trim();

    if (!submittedPrompt) {
      return;
    }

    setError(null);
    setShowGeneratingOverlay(true);

    startTransition(async () => {
      try {
        const result = await createCampaignFromPrompt(submittedPrompt);

        if (!result.success) {
          setError(result.error);
          setShowGeneratingOverlay(false);
          return;
        }

        setPrompt("");
        router.push(`/campaigns/${result.campaignId}`);
      } catch (error) {
        console.error(error);
        setError("Unable to generate an action right now.");
        setShowGeneratingOverlay(false);
      }
    });
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

          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isPending || !prompt.trim()}
              className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Generating..." : "Generate Action"}
            </button>

            <p className="text-sm text-gray-500">
              MarketForge will create a full action package for review.
            </p>
          </div>
        </section>

        <aside className="mf-card rounded-3xl p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
            Prompt Ideas
          </p>

          <div className="mt-4 space-y-3">
            {SUGGESTIONS.map((item) => (
              <button
                key={`aside-${item}`}
                type="button"
                onClick={() => setPrompt(item)}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                {item}
              </button>
            ))}
          </div>
        </aside>
      </div>

      <SystemStatusOverlay
        mode="generating"
        visible={showGeneratingOverlay}
      />
    </>
  );
}