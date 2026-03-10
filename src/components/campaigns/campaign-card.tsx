import Link from "next/link";
import { Campaign } from "@prisma/client";

type Props = {
  campaign: Campaign;
};

const STATUS_LABELS: Record<Campaign["status"], string> = {
  DRAFT: "Draft",
  READY: "Draft Ready",
  APPROVED: "Approved",
  SCHEDULED: "Queued for Launch",
  LAUNCHED: "Launched",
  COMPLETED: "Completed",
};

export function CampaignCard({ campaign }: Props) {
  const revenue = campaign.estimatedRevenue
    ? Number(campaign.estimatedRevenue)
    : 0;

  return (
    <Link href={`/campaigns/${campaign.id}`} className="block">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-blue-300 hover:shadow-md">
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
            {STATUS_LABELS[campaign.status]}
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

        <div className="mt-4 text-sm font-medium text-blue-700">
          Review campaign →
        </div>
      </div>
    </Link>
  );
}