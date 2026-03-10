import Link from "next/link";
import { RevenueOpportunityHero } from "@/lib/revenue-opportunity-engine";
import { DashboardRecommendationCard } from "./recommended-campaigns-panel";

type Props = {
  hero: RevenueOpportunityHero;
  recommendations: DashboardRecommendationCard[];
};

export function TopCommandBand({ hero, recommendations }: Props) {
  const topRecommendations = recommendations.slice(0, 3);

  return (
    <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              Primary Opportunity
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
              {hero.bestMove}
            </h2>
          </div>

          <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            {hero.confidenceScore}% {hero.confidenceLabel}
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-gray-700">
          {hero.whyThisMatters}
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Why This Exists
            </p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-700">
              {hero.whyNowBullets.map((bullet) => (
                <li key={bullet}>• {bullet}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Opportunity Signals
            </p>

            <div className="mt-3 space-y-3 text-sm text-gray-700">
              <div>
                <span className="font-semibold text-gray-900">Capacity Fit:</span>{" "}
                {hero.capacityFit}
              </div>
              <div>
                <span className="font-semibold text-gray-900">Sources:</span>{" "}
                {hero.sourceTags.join(" • ")}
              </div>
              <div>
                <span className="font-semibold text-gray-900">Available Capacity:</span>{" "}
                ~{hero.availableJobsEstimate} jobs this week
              </div>
            </div>

            <Link
              href="/campaigns"
              className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Launch Campaign
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Recommended Campaigns
            </p>
            <p className="mt-2 text-sm text-gray-600">
              Fastest launch-ready moves based on current opportunity signals.
            </p>
          </div>

          <Link
            href="/campaigns"
            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            View All
          </Link>
        </div>

        <div className="mt-5 space-y-4">
          {topRecommendations.map((recommendation) => (
            <div
              key={recommendation.id}
              className="rounded-xl border border-gray-200 bg-gray-50 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-gray-900">
                    {recommendation.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {recommendation.description ?? "No description available."}
                  </p>
                </div>

                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {recommendation.score.toFixed(1)}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between text-sm">
                <div className="text-gray-700">
                  <span className="font-semibold text-gray-900">Revenue:</span>{" "}
                  ${recommendation.estimatedRevenueMin.toLocaleString()}–$
                  {recommendation.estimatedRevenueMax.toLocaleString()}
                </div>
                <div className="text-gray-700">
                  <span className="font-semibold text-gray-900">Jobs:</span>{" "}
                  {recommendation.estimatedBookedJobsMin ?? 0}–
                  {recommendation.estimatedBookedJobsMax ?? 0}
                </div>
              </div>

              <div className="mt-4">
                {recommendation.linkedCampaignId ? (
                  <Link
                    href={`/campaigns/${recommendation.linkedCampaignId}`}
                    className="inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Review & Launch
                  </Link>
                ) : (
                  <Link
                    href="/campaigns"
                    className="inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Generate Campaign
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}