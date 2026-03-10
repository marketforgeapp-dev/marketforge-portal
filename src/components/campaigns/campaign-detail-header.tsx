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

export function CampaignDetailHeader({ campaign }: Props) {
  const revenue = campaign.estimatedRevenue
    ? Number(campaign.estimatedRevenue)
    : 0;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            Campaign Review
          </p>

          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            {campaign.name}
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
            Review this Draft Ready campaign, confirm the messaging, and move it
            forward for MarketForge-managed launch.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/api/export-pack/${campaign.id}`}
            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            Export Pack
          </Link>

          <span className="rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">
            {STATUS_LABELS[campaign.status]}
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <div className="rounded-xl bg-gray-50 p-4">
          <p className="text-xs text-gray-600">Target Service</p>
          <p className="mt-2 text-sm font-semibold text-gray-900">
            {campaign.targetService ?? "General plumbing"}
          </p>
        </div>

        <div className="rounded-xl bg-gray-50 p-4">
          <p className="text-xs text-gray-600">Est Leads</p>
          <p className="mt-2 text-sm font-semibold text-gray-900">
            {campaign.estimatedLeads ?? 0}
          </p>
        </div>

        <div className="rounded-xl bg-gray-50 p-4">
          <p className="text-xs text-gray-600">Est Jobs</p>
          <p className="mt-2 text-sm font-semibold text-gray-900">
            {campaign.estimatedBookedJobs ?? 0}
          </p>
        </div>

        <div className="rounded-xl bg-gray-50 p-4">
          <p className="text-xs text-gray-600">Est Revenue</p>
          <p className="mt-2 text-sm font-semibold text-gray-900">
            ${revenue.toLocaleString()}
          </p>
        </div>
      </div>
    </section>
  );
}