"use client";

import { useState, useTransition } from "react";
import { generateOnboardingPrefill } from "@/app/onboarding/prefill-actions";
import type { OnboardingPrefillResult } from "@/lib/onboarding-prefill-schema";

type Props = {
  onApply: (data: OnboardingPrefillResult) => void;
};

export function OnboardingAiPrefill({ onApply }: Props) {
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [result, setResult] = useState<OnboardingPrefillResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    setError(null);

    startTransition(async () => {
      const response = await generateOnboardingPrefill({
        companyName,
        website,
      });

      if (!response.success) {
        setError(response.error);
        return;
      }

      setResult(response.data);
    });
  }

  return (
    <section className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
        AI Assisted Onboarding
      </p>

      <h2 className="mt-2 text-2xl font-bold text-gray-900">
        Start with company name and website
      </h2>

      <p className="mt-2 text-sm leading-6 text-gray-600">
        MarketForge will suggest business details, likely services, logo URLs,
        and likely competitors. You review and apply the suggestions.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="BluePeak Plumbing"
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900"
        />

        <input
          type="text"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="bluepeakplumbing.com"
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900"
        />
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isPending || !companyName.trim() || !website.trim()}
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {isPending ? "Generating..." : "Generate Suggestions"}
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-lg font-semibold text-gray-900">
                {result.businessName}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                {result.serviceArea ?? "Service area not suggested yet"}
              </p>
            </div>

            {result.logoUrl ? (
              <img
                src={result.logoUrl}
                alt={`${result.businessName} logo`}
                className="h-12 w-12 rounded-lg border border-gray-200 bg-white object-contain p-1"
              />
            ) : null}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Suggested Services
              </p>
              <ul className="mt-2 space-y-1 text-sm text-gray-700">
                {result.preferredServices.map((service) => (
                  <li key={service}>• {service}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Suggested Competitors
              </p>
              <ul className="mt-2 space-y-2 text-sm text-gray-700">
                {result.competitors.map((competitor) => (
                  <li key={competitor.name}>
                    <span className="font-semibold text-gray-900">
                      {competitor.name}
                    </span>
                    <span className="text-gray-600">
                      {" "}
                      — {competitor.whyItMatters}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-5">
            <button
              type="button"
              onClick={() => onApply(result)}
              className="rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-700"
            >
              Apply Suggestions to Onboarding
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}