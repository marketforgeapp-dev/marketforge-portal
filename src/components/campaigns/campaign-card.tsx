import { Campaign } from "@prisma/client";

type Props = {
  campaign: Campaign;
};

export function CampaignCard({ campaign }: Props) {
  const revenue = campaign.estimatedRevenue
    ? Number(campaign.estimatedRevenue)
    : 0;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            {campaign.campaignType.replaceAll("_", " ")}
          </p>

          <h3 className="mt-2 text-lg font-bold text-gray-900">
            {campaign.name}
          </h3>

          <p className="mt-2 text-sm text-gray-600">
            Target Service: {campaign.targetService ?? "General plumbing"}
          </p>
        </div>

        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
          {campaign.status}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
  <div className="rounded-xl bg-gray-50 p-3">
    <p className="text-xs text-gray-600">Est Leads</p>
    <p className="text-sm font-semibold text-gray-900">
      {campaign.estimatedLeads ?? 0}
    </p>
  </div>

  <div className="rounded-xl bg-gray-50 p-3">
    <p className="text-xs text-gray-600">Est Jobs</p>
    <p className="text-sm font-semibold text-gray-900">
      {campaign.estimatedBookedJobs ?? 0}
    </p>
  </div>

  <div className="rounded-xl bg-gray-50 p-3">
    <p className="text-xs text-gray-600">Est Revenue</p>
    <p className="text-sm font-semibold text-gray-900">
      ${revenue.toLocaleString()}
    </p>
  </div>
</div>
    </div>
  );
}