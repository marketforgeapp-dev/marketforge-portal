"use client";

import { useState, useTransition } from "react";
import { generateOnboardingPrefill } from "@/app/onboarding/prefill-actions";
import type { OnboardingPrefillResult } from "@/lib/onboarding-prefill-schema";

type Props = {
  onApply: (data: OnboardingPrefillResult) => void;
};

function FieldPill({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-sm text-gray-800">{value}</p>
    </div>
  );
}

function ListCard({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <div className="rounded-xl bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </p>

      {items.length > 0 ? (
        <ul className="mt-3 space-y-1 text-sm text-gray-700">
          {items.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-gray-500">{emptyLabel}</p>
      )}
    </div>
  );
}

function CompetitorMetaLine({
  value,
}: {
  value: string | null | undefined;
}) {
  if (!value) return null;

  return <p className="mt-1 text-sm text-gray-600">{value}</p>;
}

export function OnboardingAiPrefill({ onApply }: Props) {
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [result, setResult] = useState<OnboardingPrefillResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasApplied, setHasApplied] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

    function handleGenerate() {
    if (isPending || !companyName.trim() || !website.trim()) {
      return;
    }

    setError(null);
    setHasApplied(false);
    setLoadingMessage(
      "Analyzing website, identifying services, and building competitor suggestions..."
    );

    startTransition(async () => {
      try {
        const response = await generateOnboardingPrefill({
          companyName,
          website,
        });

        if (!response.success) {
          setError(response.error);
          setLoadingMessage(null);
          return;
        }

        setLoadingMessage("Applying suggestions to your onboarding workspace...");
        setResult(response.data);
        onApply(response.data);
        setHasApplied(true);
        setLoadingMessage(null);
      } catch (error) {
        console.error(error);
        setError("Unable to generate onboarding suggestions right now.");
        setLoadingMessage(null);
      }
    });
  }

  return (
    <section className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
        AI Assisted Onboarding
      </p>

      <h2 className="mt-2 text-2xl font-bold text-gray-900">
          Let MarketForge prepare your workspace
      </h2>

      <p className="mt-2 text-sm leading-6 text-gray-600">
        MarketForge analyzes the website and automatically prepares your
        business profile, services, and local competitive landscape.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
                <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Enter company name"
          disabled={isPending}
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
        />

                <input
          type="text"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleGenerate();
            }
          }}
          placeholder="Enter company website"
          disabled={isPending}
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isPending || !companyName.trim() || !website.trim()}
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
                    {isPending ? "Generating & Applying..." : "Generate & Apply Suggestions"}
        </button>

        {hasApplied ? (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
            Suggestions applied to onboarding
          </span>
        ) : null}
      </div>

            {loadingMessage ? (
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
            <div>
              <p className="text-sm font-semibold text-blue-900">
                MarketForge is preparing your workspace
              </p>
              <p className="mt-1 text-sm text-blue-800">{loadingMessage}</p>
              <p className="mt-2 text-xs text-blue-700">
                This can take a little bit because MarketForge is analyzing the
                website, checking local competitor signals, and generating suggestions.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="mt-6 space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-lg font-semibold text-gray-900">
                {result.businessName}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                Review these suggestions before continuing.
              </p>
            </div>

            {result.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={result.logoUrl}
                alt={`${result.businessName} logo`}
                className="h-14 w-14 rounded-lg border border-gray-200 bg-white object-contain p-1"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-gray-200 bg-white text-[10px] font-medium uppercase tracking-wide text-gray-400">
                No Logo
              </div>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <FieldPill label="Website" value={result.website} />
            <FieldPill label="Phone" value={result.phone} />
            <FieldPill
              label="Location"
              value={[result.city, result.state].filter(Boolean).join(", ")}
            />
            <FieldPill label="Service Area" value={result.serviceArea} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ListCard
              title="Suggested Services"
              items={result.preferredServices}
              emptyLabel="No services suggested yet."
            />

            <ListCard
              title="Service Pages"
              items={result.servicePageUrls}
              emptyLabel="No service pages detected yet."
            />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Suggested Competitors
                </p>
                <p className="mt-1 text-sm text-gray-600">
                    MarketForge detected nearby competitors automatically.  
                    You can refine or replace these later in Settings.
                </p>
              </div>

              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                {result.competitors.length} found
              </span>
            </div>

            {result.competitors.length > 0 ? (
              <div className="mt-4 grid gap-3">
                {result.competitors.map((competitor) => (
                  <div
                    key={competitor.name}
                    className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="flex items-start gap-3">
                      {competitor.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={competitor.logoUrl}
                          alt={`${competitor.name} logo`}
                          className="h-12 w-12 rounded-lg border border-gray-200 bg-white object-contain p-1"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-gray-200 bg-white text-[10px] font-medium uppercase tracking-wide text-gray-400">
                          No Logo
                        </div>
                      )}

                                            <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900">
                          {competitor.name}
                        </p>

                        {competitor.websiteUrl ? (
                          <p className="mt-1 break-all text-sm text-blue-700">
                            {competitor.websiteUrl}
                          </p>
                        ) : null}

                        <CompetitorMetaLine value={competitor.formattedAddress} />
                        <CompetitorMetaLine value={competitor.phone} />

                        <p className="mt-2 text-sm text-gray-600">
                          {competitor.whyItMatters}
                        </p>

                        {competitor.serviceFocus.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {competitor.serviceFocus.map((focus) => (
                              <span
                                key={focus}
                                className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700"
                              >
                                {focus}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-500">
                No competitors suggested yet.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            AI suggestions have been applied to the onboarding form below.
            Review and edit anything before continuing. Review and adjust
            anything before continuing. MarketForge will use these inputs
            to generate your first set of revenue opportunities.
          </div>
        </div>
      ) : null}
    </section>
  );
}