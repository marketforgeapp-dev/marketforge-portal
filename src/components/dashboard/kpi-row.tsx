const KPI_ITEMS = [
  { label: "Impressions", value: "18.4K", delta: "+12%" },
  { label: "Clicks", value: "1,240", delta: "+8%" },
  { label: "Leads", value: "47", delta: "+14%" },
  { label: "Revenue", value: "$21,300", delta: "+9%" },
  { label: "ROI", value: "3.8x", delta: "+0.6x" },
];

export function KpiRow() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {KPI_ITEMS.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {item.label}
            </p>
            <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
              {item.delta}
            </span>
          </div>

          <p className="mt-4 text-3xl font-bold tracking-tight text-gray-900">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}