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
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
        Next Best Action
      </p>

      <h2 className="mt-2 text-2xl font-bold text-gray-900">
        What should MarketForge create or recommend next?
      </h2>

      <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
        Describe the business goal in plain English. MarketForge will evaluate the
        best next action across revenue, capacity, competitor pressure, and
        AI/local visibility signals, then generate a draft-ready execution plan.
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
          rows={5}
          placeholder="Example: Should we push drain cleaning this week, or is improving local FAQ / AEO visibility a better move first?"
          className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mt-5 flex items-center justify-between">
        <p className="text-xs text-gray-500">
          MarketForge may recommend a campaign, an AEO/SEO action pack, or another
          execution-ready move based on current intelligence.
        </p>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={isPending || prompt.trim().length < 10}
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Generating..." : "Generate Draft"}
        </button>
      </div>
    </section>
  );
}