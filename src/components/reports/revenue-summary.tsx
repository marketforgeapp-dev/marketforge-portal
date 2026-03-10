import { AttributionEntry } from "@prisma/client";

type Props = {
  entries: AttributionEntry[];
};

export function RevenueSummary({ entries }: Props) {
  const leads = entries.reduce((sum, e) => sum + (e.leadsGenerated ?? 0), 0);

  const jobs = entries.reduce((sum, e) => sum + (e.bookedJobs ?? 0), 0);

  const revenue = entries.reduce(
    (sum, e) => sum + Number(e.revenue ?? 0),
    0
  );

  const avgRoi =
    entries.length > 0
      ? (
          entries.reduce((sum, e) => sum + (e.roi ?? 0), 0) / entries.length
        ).toFixed(1)
      : "0.0";

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-xs text-gray-600">Attributed Leads</p>
        <p className="mt-2 text-2xl font-bold text-gray-900">{leads}</p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-xs text-gray-600">Booked Jobs</p>
        <p className="mt-2 text-2xl font-bold text-gray-900">{jobs}</p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-xs text-gray-600">Revenue Captured</p>
        <p className="mt-2 text-2xl font-bold text-gray-900">
          ${revenue.toLocaleString()}
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-xs text-gray-600">Average ROI</p>
        <p className="mt-2 text-2xl font-bold text-gray-900">{avgRoi}x</p>
      </div>
    </div>
  );
}