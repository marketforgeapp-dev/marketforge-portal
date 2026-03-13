type Props = {
  score: number;
};

export function AeoScoreCard({ score }: Props) {
  const status =
    score >= 80 ? "Strong" : score >= 60 ? "Developing" : "Needs Attention";

  return (
    <div className="mf-card rounded-3xl p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600">
        AI Search Readiness
      </p>

      <div className="mt-4 flex items-end gap-3">
        <p className="text-5xl font-bold tracking-tight text-gray-900">
          {score}
        </p>
        <p className="mb-1 text-sm font-medium text-gray-600">/ 100</p>
      </div>

      <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-blue-600"
          style={{ width: `${score}%` }}
        />
      </div>

      <p className="mt-4 text-sm text-gray-700">
        Current status:{" "}
        <span className="font-semibold text-gray-900">{status}</span>
      </p>

      <p className="mt-2 text-sm leading-6 text-gray-600">
        MarketForge estimates how prepared your business is to appear in
        answer-engine and AI-assisted local search results based on FAQ
        coverage, service-page depth, and answer-ready content signals.
      </p>
    </div>
  );
}