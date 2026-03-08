import { Competitor } from "@prisma/client";

type Props = {
  competitor: Competitor;
};

export function CompetitorCard({ competitor }: Props) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            {competitor.name}
          </h3>

          {competitor.websiteUrl && (
            <p className="mt-1 text-sm text-blue-600">
              {competitor.websiteUrl}
            </p>
          )}
        </div>

        {competitor.isPrimaryCompetitor && (
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            Primary Competitor
          </span>
        )}
      </div>

      {competitor.notes && (
        <p className="mt-3 text-sm text-gray-600 leading-6">
          {competitor.notes}
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-gray-50 p-3">
          <p className="text-xs text-gray-600">Rating</p>
          <p className="text-sm font-semibold text-gray-900">
            {competitor.rating ?? "—"}
          </p>
        </div>

        <div className="rounded-xl bg-gray-50 p-3">
          <p className="text-xs text-gray-600">Reviews</p>
          <p className="text-sm font-semibold text-gray-900">
            {competitor.reviewCount ?? "—"}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
        {competitor.isRunningAds && (
          <span className="rounded-full bg-green-50 px-2.5 py-1 text-green-700">
            Running Ads
          </span>
        )}

        {competitor.isPostingActively && (
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
            Active Content
          </span>
        )}

        {competitor.hasActivePromo && (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
            Promo Active
          </span>
        )}
      </div>

      {competitor.signalSummary && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs font-semibold text-gray-500 uppercase">
            Signal Summary
          </p>

          <p className="mt-1 text-sm text-gray-700">
            {competitor.signalSummary}
          </p>
        </div>
      )}
    </div>
  );
}