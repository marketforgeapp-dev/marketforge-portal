import Link from "next/link";
import { RevenueOpportunityHero } from "@/lib/revenue-opportunity-engine";

type Props = {
  hero: RevenueOpportunityHero;
};

export function MissedRevenueCard({ hero }: Props) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex-1">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            Jobs You Can Capture This Week
          </p>

          <h2 className="mt-3 text-5xl font-bold tracking-tight text-gray-900">
            {hero.headlineJobsText}
          </h2>

          <div className="mt-3">
            <p className="text-sm font-medium text-gray-600">
              Estimated Revenue
            </p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {hero.headlineRevenueText}
            </p>
          </div>

          <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Recommended Campaign
            </p>
            <p className="mt-2 text-xl font-semibold text-gray-900">
              {hero.bestMove}
            </p>
          </div>

          <div className="mt-5">
            <p className="text-sm font-semibold text-gray-900">
              Why This Exists
            </p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-700">
              {hero.whyNowBullets.map((bullet) => (
                <li key={bullet}>• {bullet}</li>
              ))}
            </ul>
          </div>

          {hero.competitorSignal.length > 0 ? (
            <div className="mt-5">
              <p className="text-sm font-semibold text-gray-900">
                Competitor Pressure
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-700">
                {hero.competitorSignal.map((signal) => (
                  <li key={signal}>• {signal}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="w-full xl:max-w-sm">
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Confidence
                </p>
                <p className="mt-2 text-lg font-semibold text-gray-900">
                  {hero.confidenceScore}% ({hero.confidenceLabel})
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Capacity Fit
                </p>
                <p className="mt-2 text-lg font-semibold text-gray-900">
                  {hero.capacityFit}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Sources
                </p>
                <p className="mt-2 text-sm font-medium text-gray-900">
                  {hero.sourceTags.join(" • ")}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Available Capacity
                </p>
                <p className="mt-2 text-sm font-medium text-gray-900">
                  ~{hero.availableJobsEstimate} jobs this week
                </p>
              </div>
            </div>

            <Link
              href="/campaigns"
              className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Review Campaign
            </Link>
          </div>

          <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <p className="text-sm font-semibold text-gray-900">
              Why This Matters
            </p>
            <p className="mt-3 text-sm leading-6 text-gray-700">
              {hero.whyThisMatters}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}