import { getIndustryCopy } from "@/lib/industry-copy";

type Props = {
  industry?: "PLUMBING" | "SEPTIC" | "TREE_SERVICE" | "HVAC" | null;
  score: number;
  recommendations: string[];
};

function buildFallbackRecommendations(
  industry: "PLUMBING" | "SEPTIC" | "TREE_SERVICE" | "HVAC" | null | undefined
): string[] {
  const copy = getIndustryCopy(industry);

  return [
    copy.recommendationTemplates.faq,
    copy.recommendationTemplates.servicePages,
    copy.recommendationTemplates.contentLayer,
    copy.recommendationTemplates.googleBusiness,
    copy.recommendationTemplates.authority,
  ];
}

export function AeoRecommendations({
  industry,
  score,
  recommendations,
}: Props) {
    const resolvedRecommendations =
    recommendations.length > 0
      ? recommendations
      : score >= 90
        ? []
        : buildFallbackRecommendations(industry);

  const copy = getIndustryCopy(industry);

  return (
    <div className="mf-card rounded-3xl p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
            Recommended AEO Actions
          </p>
          <p className="mt-1 text-sm text-gray-600">
            The highest-impact {copy.industryLabel.toLowerCase()} visibility improvements
            MarketForge would prioritize next.
          </p>
        </div>

        <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-semibold text-blue-700">
          Action Backlog
        </span>
      </div>

      <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm leading-6 text-gray-600">
          {copy.aeoPrioritySummary}
        </p>
      </div>

            {resolvedRecommendations.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-semibold text-gray-900">
            AEO baseline is already strong.
          </p>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            MarketForge is not surfacing a major AEO improvement backlog right now.
            Maintain your current answer-ready content, keep core service pages current,
            and review changes periodically as search behavior evolves.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {resolvedRecommendations.map((item, index) => (
            <div
              key={`${index}-${item}`}
              className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                #{index + 1} Recommended Move
              </p>

              <p className="mt-2 text-sm font-medium leading-6 text-gray-900">
                {item}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}