type Props = {
  recommendations: string[];
};

export function AeoRecommendations({ recommendations }: Props) {
  return (
    <div className="mf-card rounded-3xl p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
            Recommended AEO Actions
          </p>
          <p className="mt-1 text-sm text-gray-600">
            The highest-impact visibility improvements MarketForge would prioritize next.
          </p>
        </div>

        <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-semibold text-blue-700">
          Action Backlog
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {recommendations.map((item, index) => (
          <div
            key={item}
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
    </div>
  );
}