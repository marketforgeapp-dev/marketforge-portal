import Link from "next/link";
import { Campaign, Prisma } from "@/generated/prisma";
import { ExecutionStatusActions } from "./execution-status-actions";

type ExecutionMeta = {
  scheduledLaunchDate?: string | null;
  launchOwner?: string | null;
  launchPlatform?: string | null;
  credentialsReceived?: boolean;
  launchNotes?: string | null;
};

type CampaignWithExecution = Campaign & {
  briefJson: Prisma.JsonValue | null;
};

type Props = {
  campaign: CampaignWithExecution;
};

function getExecutionMeta(
  briefJson: Prisma.JsonValue | null
): ExecutionMeta | null {
  if (!briefJson || typeof briefJson !== "object" || Array.isArray(briefJson)) {
    return null;
  }

  const record = briefJson as Record<string, unknown>;
  const execution = record.execution;

  if (!execution || typeof execution !== "object" || Array.isArray(execution)) {
    return null;
  }

  return execution as ExecutionMeta;
}

function statusLabel(status: Campaign["status"]) {
  const labels: Record<Campaign["status"], string> = {
    DRAFT: "Draft",
    READY: "Draft Ready",
    APPROVED: "Approved",
    SCHEDULED: "Queued",
    LAUNCHED: "Launched",
    COMPLETED: "Completed",
  };

  return labels[status];
}

export function ExecutionCard({ campaign }: Props) {
  const execution = getExecutionMeta(campaign.briefJson);
  const revenue = Number(campaign.estimatedRevenue ?? 0);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-600">
            {statusLabel(campaign.status)}
          </p>

          <h3 className="mt-2 text-base font-bold leading-tight text-gray-900">
            {campaign.name}
          </h3>

          <p className="mt-1 text-sm text-gray-600">
            {campaign.targetService ?? "General service action"}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Link
            href={`/api/export-pack/${campaign.id}`}
            className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100"
          >
            Export Pack
          </Link>

          <Link
            href={`/campaigns/${campaign.id}`}
            className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100"
          >
            Open Action
          </Link>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-gray-50 p-3">
          <p className="text-[10px] uppercase tracking-wide text-gray-500">
            Est Jobs
          </p>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            {campaign.estimatedBookedJobs ?? 0}
          </p>
        </div>

        <div className="rounded-xl bg-gray-50 p-3">
          <p className="text-[10px] uppercase tracking-wide text-gray-500">
            Est Revenue
          </p>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            ${revenue.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm text-gray-700">
        <p>
          <span className="font-semibold text-gray-900">Platform:</span>{" "}
          {execution?.launchPlatform ?? "Not set"}
        </p>
        <p>
          <span className="font-semibold text-gray-900">Owner:</span>{" "}
          {execution?.launchOwner ?? "Not assigned"}
        </p>
        <p>
          <span className="font-semibold text-gray-900">Scheduled:</span>{" "}
          {execution?.scheduledLaunchDate ?? "Not scheduled"}
        </p>
        <p>
          <span className="font-semibold text-gray-900">Access:</span>{" "}
          {execution?.credentialsReceived ? "Received" : "Not received"}
        </p>
        <p>
          <span className="font-semibold text-gray-900">Notes:</span>{" "}
          {execution?.launchNotes ?? "—"}
        </p>
      </div>

      <div className="mt-4">
        <ExecutionStatusActions campaignId={campaign.id} status={campaign.status} />
      </div>
    </div>
  );
}