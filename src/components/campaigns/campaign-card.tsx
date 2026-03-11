import Link from "next/link";
import { Campaign } from "@/generated/prisma";

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

function buildCreativeLines(campaign: Campaign) {
  return [
    campaign.offer ?? "Launch-ready local service offer",
    campaign.audience ?? "Targeted local homeowner audience",
    campaign.targetService ?? "Service-focused promotion",
  ]
    .filter(Boolean)
    .slice(0, 3);
}

export function CampaignCard({ campaign }: Props) {
  const revenue = campaign.estimatedRevenue
    ? Number(campaign.estimatedRevenue)
    : 0;

  const creativeLines = buildCreativeLines(campaign);

  return (
    <Link href={`/campaigns/${campaign.id}`} className="block">
      <div className="mf-card mf-card-highlight rounded-2xl p-5">
        <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 p-4 text-white shadow-sm">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.24),transparent_40%)]" />
            <div className="relative flex min-h-[170px] flex-col justify-between">
              <div>
                <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/90">
                  Campaign Creative
                </span>

                <p className="mt-3 max-w-[16rem] text-lg font-semibold leading-tight">
                  {campaign.name}
                </p>
              </div>

              <div className="space-y-2">
                {creativeLines.map((line) => (
                  <p
                    key={line}
                    className="max-w-[17rem] text-sm leading-5 text-white/85"
                  >
                    {line}
                  </p>
                ))}

                <div className="pt-1">
                  <span className="inline-flex rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-900">
                    Review Campaign
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                    {campaign.campaignType.replaceAll("_", " ")}
                  </p>

                  <h3 className="mt-2 text-lg font-bold text-gray-900">
                    {campaign.name}
                  </h3>

                  <p className="mt-2 text-sm text-gray-600">
                    Target Service:{" "}
                    {campaign.targetService ?? "General plumbing"}
                  </p>
                </div>

                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                  {STATUS_LABELS[campaign.status]}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-600">Est Leads</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {campaign.estimatedLeads ?? 0}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-600">Est Jobs</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {campaign.estimatedBookedJobs ?? 0}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-600">Est Revenue</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    ${revenue.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 text-sm font-medium text-blue-700">
              Review campaign →
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}