type Props = {
  recommendations: string[];
};

export function AeoRecommendations({ recommendations }: Props) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        Recommended Actions
      </p>

      <div className="mt-4 space-y-3">
        {recommendations.map((item) => (
          <div
            key={item}
            className="rounded-xl border border-gray-200 bg-gray-50 p-4"
          >
            <p className="text-sm font-medium text-gray-900">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}