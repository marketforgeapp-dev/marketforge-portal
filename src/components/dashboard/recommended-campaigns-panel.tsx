import Link from "next/link";

export type DashboardRecommendationCard = {
  id: string;
  title: string;
  description: string | null;
  score: number;
  estimatedRevenueMin: number;
  estimatedRevenueMax: number;
  estimatedBookedJobsMin: number | null;
  estimatedBookedJobsMax: number | null;
  linkedCampaignId: string | null;
};

type Props = {
  recommendations: DashboardRecommendationCard[];
};

export function RecommendedCampaignsPanel({ recommendations }: Props) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Recommended Campaigns
          </p>
          <p className="mt-2 text-sm text-gray-600">
            Launch-ready campaign guidance tied to current revenue opportunities.
          </p>
        </div>

        <Link
          href="/campaigns"
          className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          View All Campaigns
        </Link>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {recommendations.map((recommendation) => (
          <div
            key={recommendation.id}
            className="rounded-xl border border-gray-200 bg-gray-50 p-5"
          >
            <div className="flex items-start justify-between gap-4">
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

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-white p-3">
                <p className="text-xs text-gray-600">Estimated Revenue</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  ${recommendation.estimatedRevenueMin.toLocaleString()}–$
                  {recommendation.estimatedRevenueMax.toLocaleString()}
                </p>
              </div>

              <div className="rounded-lg bg-white p-3">
                <p className="text-xs text-gray-600">Expected Jobs</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {recommendation.estimatedBookedJobsMin ?? 0}–
                  {recommendation.estimatedBookedJobsMax ?? 0}
                </p>
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
    </section>
  );
}