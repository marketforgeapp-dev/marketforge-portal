import {
  createWebsiteIntelligenceAction,
  openWebsiteImplementationPlan,
} from "@/app/aeo/actions";
import { WebsiteIntelligenceActionButton } from "@/components/aeo/website-intelligence-action-button";

import type {
  WebsiteIntelligenceRecommendation,
  WebsiteIntelligenceRecommendationExecutionType,
} from "@/lib/website-intelligence-recommendations";

type Props = {
  recommendations: WebsiteIntelligenceRecommendation[];
};

function formatGapType(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getExecutionLabel(
  executionType: WebsiteIntelligenceRecommendationExecutionType
): string {
  return executionType === "MARKETFORGE_EXECUTABLE"
    ? "MarketForge Can Do This"
    : "Website Change Recommended";
}

function getExecutionClasses(
  executionType: WebsiteIntelligenceRecommendationExecutionType
): string {
  return executionType === "MARKETFORGE_EXECUTABLE"
    ? "bg-blue-50 text-blue-700"
    : "bg-amber-50 text-amber-700";
}

function sortRecommendationsForDisplay(
  recommendations: WebsiteIntelligenceRecommendation[]
): WebsiteIntelligenceRecommendation[] {
  return [...recommendations].sort((left, right) => {
    const leftExecutable =
      left.executionType === "MARKETFORGE_EXECUTABLE";
    const rightExecutable =
      right.executionType === "MARKETFORGE_EXECUTABLE";

    if (leftExecutable !== rightExecutable) {
      return leftExecutable ? -1 : 1;
    }

    return left.priority - right.priority;
  });
}

export function AeoRecommendations({ recommendations }: Props) {
  const displayRecommendations =
    sortRecommendationsForDisplay(recommendations);

  return (
    <section className="mf-card rounded-3xl p-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
          Recommended Improvements
        </p>

        <h2 className="mt-2 text-xl font-bold text-gray-900">
          Where MarketForge would improve your website next
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
          MarketForge starts with improvements we can take on for you. When a
          change needs to be made directly to your website, we will show you
          what needs to change and prepare the guidance your website team needs.
        </p>
      </div>

      {displayRecommendations.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-5">
          <p className="text-sm font-semibold text-gray-900">
            No major website improvements are being prioritized right now.
          </p>

          <p className="mt-2 text-sm leading-6 text-gray-600">
            MarketForge will continue reviewing your live website and surface
            meaningful improvements when stronger gaps are observed.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {displayRecommendations.map((recommendation) => {
            const marketForgeCanDoThis =
              recommendation.executionType ===
              "MARKETFORGE_EXECUTABLE";

            return (
              <article
                key={recommendation.id}
                className="rounded-2xl border border-gray-200 bg-gray-50 p-5"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                        {formatGapType(recommendation.gapType)}
                      </span>

                      {recommendation.service ? (
                        <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[10px] font-semibold text-gray-600">
                          {recommendation.service}
                        </span>
                      ) : null}
                    </div>

                    <h3 className="mt-3 text-lg font-bold text-gray-900">
                      {recommendation.title}
                    </h3>
                  </div>

                  <span
                    className={`shrink-0 self-start rounded-full px-3 py-1.5 text-xs font-semibold ${getExecutionClasses(
                      recommendation.executionType
                    )}`}
                  >
                    {getExecutionLabel(recommendation.executionType)}
                  </span>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                      What MarketForge found
                    </p>

                    <p className="mt-2 text-sm leading-6 text-gray-700">
                      {recommendation.summary}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                      Why it matters
                    </p>

                    <p className="mt-2 text-sm leading-6 text-gray-700">
                      {recommendation.whyItMatters}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                    Recommended improvement
                  </p>

                  <p className="mt-2 text-sm leading-6 text-gray-700">
                    {recommendation.recommendedImprovement}
                  </p>
                </div>

                {recommendation.evidence.length > 0 ? (
                  <div className="mt-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                      Evidence
                    </p>

                    <div className="mt-2 space-y-2">
                      {recommendation.evidence
                        .slice(0, 3)
                        .map((evidence, index) => (
                          <div
                            key={`${recommendation.id}-evidence-${index}`}
                            className="rounded-xl border border-gray-200 bg-white px-4 py-3"
                          >
                            <p className="text-sm leading-5 text-gray-700">
                              {evidence.finding}
                            </p>

                            {evidence.sourceUrl ? (
                              <a
                                href={evidence.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 inline-block break-all text-xs font-medium text-blue-600 hover:text-blue-700"
                              >
                                View source
                              </a>
                            ) : null}
                          </div>
                        ))}
                    </div>
                  </div>
                ) : null}

                <div
                  className={`mt-4 rounded-xl border p-4 ${
                    marketForgeCanDoThis
                      ? "border-blue-200 bg-blue-50"
                      : "border-amber-200 bg-amber-50"
                  }`}
                >
                  {marketForgeCanDoThis ? (
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          MarketForge can take this off your plate.
                        </p>

                        <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-700">
                          MarketForge can create the work needed to address this
                          improvement, send it to you for review, and move it
                          through the normal approval and execution process.
                        </p>
                      </div>

                      <WebsiteIntelligenceActionButton
                        action={createWebsiteIntelligenceAction.bind(
                          null,
                          recommendation.id
                        )}
                        label="Create Action"
                        variant="blue"
                        overlayTitle="Creating your website action..."
                        overlayDescription="MarketForge is generating the content and publishing guidance for your review."
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          You or your web developer will need to make this change
                          on the website.
                        </p>

                        <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-700">
                          MarketForge will do the planning work first. We will prepare
                          the recommended page structure, content requirements, SEO
                          guidance, internal linking, and implementation steps so your
                          website team knows exactly what to change.
                        </p>
                      </div>

                      <WebsiteIntelligenceActionButton
                        action={openWebsiteImplementationPlan.bind(
                          null,
                          recommendation.id
                        )}
                        label="View Implementation Plan"
                        variant="amber"
                        overlayTitle="Building your implementation plan..."
                        overlayDescription="MarketForge is preparing the page structure, content requirements, SEO guidance, and developer instructions."
                      />
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}