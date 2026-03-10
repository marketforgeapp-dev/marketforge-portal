import Link from "next/link";
import { Campaign } from "@/generated/prisma";
import { Prisma } from "@/generated/prisma";
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
    SCHEDULED: "Queued for Launch",
    LAUNCHED: "Launched",
    COMPLETED: "Completed",
  };

  return labels[status];
}

export function ExecutionCard({ campaign }: Props) {
  const execution = getExecutionMeta(campaign.briefJson);
  const revenue = Number(campaign.estimatedRevenue ?? 0);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            {statusLabel(campaign.status)}
          </p>
          <h3 className="mt-2 text-lg font-bold text-gray-900">
            {campaign.name}
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            Target Service: {campaign.targetService ?? "General plumbing"}
          </p>
        </div>

                <div className="flex items-center gap-2">
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
            Open
          </Link>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
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

      <div className="mt-4 space-y-2 text-sm text-gray-700">
        <p>
          <span className="font-semibold text-gray-900">Launch Platform:</span>{" "}
          {execution?.launchPlatform ?? "Not set"}
        </p>
        <p>
          <span className="font-semibold text-gray-900">Launch Owner:</span>{" "}
          {execution?.launchOwner ?? "Not assigned"}
        </p>
        <p>
          <span className="font-semibold text-gray-900">Scheduled Date:</span>{" "}
          {execution?.scheduledLaunchDate ?? "Not scheduled"}
        </p>
        <p>
          <span className="font-semibold text-gray-900">Access Received:</span>{" "}
          {execution?.credentialsReceived ? "Yes" : "No"}
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