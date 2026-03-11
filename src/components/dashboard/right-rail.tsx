import { RevenueOpportunityHero } from "@/lib/revenue-opportunity-engine";

type Props = {
  hero: RevenueOpportunityHero;
};

function getUrgencyLabel(hero: RevenueOpportunityHero) {
  if (hero.confidenceScore >= 90 && hero.jobsHigh >= 5) {
    return {
      label: "Urgent This Week",
      tone: "bg-red-50 text-red-700 border-red-200",
    };
  }

  if (hero.confidenceScore >= 80 || hero.jobsHigh >= 4) {
    return {
      label: "Strong Opportunity",
      tone: "bg-amber-50 text-amber-700 border-amber-200",
    };
  }

  return {
    label: "Monitor Closely",
    tone: "bg-blue-50 text-blue-700 border-blue-200",
  };
}

function parseCompetitorSignal(signal: string) {
  const [name, ...rest] = signal.split(" ");
  return {
    competitorName: name,
    detail: rest.join(" ") || signal,
  };
}

export function RightRail({ hero }: Props) {
  const urgency = getUrgencyLabel(hero);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Opportunity Status
          </p>
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${urgency.tone}`}
          >
            {urgency.label}
          </span>
        </div>

        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Confidence
            </p>
            <p className="mt-2 text-lg font-semibold text-gray-900">
              {hero.confidenceScore}% {hero.confidenceLabel}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Capacity Fit
            </p>
            <p className="mt-2 text-lg font-semibold text-gray-900">
              {hero.capacityFit}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Available Capacity
            </p>
            <p className="mt-2 text-lg font-semibold text-gray-900">
              ~{hero.availableJobsEstimate} jobs this week
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Competitor Intelligence
          </p>
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
            Live Signals
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {hero.competitorSignal?.length ? (
            hero.competitorSignal.map((signal) => {
              const parsed = parseCompetitorSignal(signal);

              return (
                <div
                  key={signal}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                >
                  <p className="text-sm font-semibold text-gray-900">
                    {parsed.competitorName}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-gray-700">
                    {parsed.detail}
                  </p>
                </div>
              );
            })
          ) : (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm leading-6 text-gray-700">
                Competitor data is still limited, but current opportunity
                scoring suggests room to win locally.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Market Signals
          </p>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
            This Week
          </span>
        </div>

        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-semibold text-green-900">
              Demand Signal
            </p>
            <p className="mt-2 text-sm leading-6 text-green-800">
              {hero.whyNowBullets[0] ?? "Demand appears elevated locally."}
            </p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">
              Capacity Signal
            </p>
            <p className="mt-2 text-sm leading-6 text-amber-800">
              Estimated room for ~{hero.availableJobsEstimate} additional jobs
              this week.
            </p>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-semibold text-blue-900">
              Visibility Signal
            </p>
            <p className="mt-2 text-sm leading-6 text-blue-800">
              Sources: {hero.sourceTags.join(" • ")}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}