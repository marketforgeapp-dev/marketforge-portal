import { AttributionEntry } from "@prisma/client";

type Props = {
  attribution: AttributionEntry[];
};

export function CampaignPerformance({ attribution }: Props) {
  if (!attribution.length) return null;

  const entry = attribution[0];

  const revenue = entry.revenue ? Number(entry.revenue) : 0;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        Performance Snapshot
      </p>

      <div className="mt-4 grid grid-cols-4 gap-3">
  <div className="rounded-xl bg-gray-50 p-3">
    <p className="text-xs text-gray-600">Leads</p>
    <p className="text-sm font-semibold text-gray-900">
      {entry.leadsGenerated ?? 0}
    </p>
  </div>

  <div className="rounded-xl bg-gray-50 p-3">
    <p className="text-xs text-gray-600">Jobs</p>
    <p className="text-sm font-semibold text-gray-900">
      {entry.bookedJobs ?? 0}
    </p>
  </div>

  <div className="rounded-xl bg-gray-50 p-3">
    <p className="text-xs text-gray-600">Revenue</p>
    <p className="text-sm font-semibold text-gray-900">
      ${revenue.toLocaleString()}
    </p>
  </div>

  <div className="rounded-xl bg-gray-50 p-3">
    <p className="text-xs text-gray-600">ROI</p>
    <p className="text-sm font-semibold text-gray-900">
      {entry.roi ?? 0}x
    </p>
  </div>
</div>
    </div>
  );
}