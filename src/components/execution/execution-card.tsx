import Link from "next/link";
import { Campaign, CampaignAsset, Prisma } from "@/generated/prisma";
import { ExecutionStatusActions } from "./execution-status-actions";

type ExecutionMeta = {
  scheduledLaunchDate?: string | null;
  launchOwner?: string | null;
  launchPlatform?: string | null;
  credentialsReceived?: boolean;
  launchNotes?: string | null;
  approvedAssetTypes?: string[];
};

type CampaignWithExecution = Campaign & {
  briefJson: Prisma.JsonValue | null;
  campaignAssets: Pick<CampaignAsset, "id" | "assetType" | "isApproved">[];
};

type EstimatedRange = {
  jobsLow?: number | null;
  jobsHigh?: number | null;
  revenueLow?: number | null;
  revenueHigh?: number | null;
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

function extractEstimatedRange(
  briefJson: Prisma.JsonValue | null
): EstimatedRange | null {
  if (!briefJson || typeof briefJson !== "object" || Array.isArray(briefJson)) {
    return null;
  }

  const record = briefJson as Record<string, unknown>;
  const range = record.estimatedRange;

  if (!range || typeof range !== "object" || Array.isArray(range)) {
    return null;
  }

  const estimatedRange = range as Record<string, unknown>;

  return {
    jobsLow:
      typeof estimatedRange.jobsLow === "number" ? estimatedRange.jobsLow : null,
    jobsHigh:
      typeof estimatedRange.jobsHigh === "number" ? estimatedRange.jobsHigh : null,
    revenueLow:
      typeof estimatedRange.revenueLow === "number"
        ? estimatedRange.revenueLow
        : null,
    revenueHigh:
      typeof estimatedRange.revenueHigh === "number"
        ? estimatedRange.revenueHigh
        : null,
  };
}

function statusLabel(status: Campaign["status"]) {
  const labels: Record<Campaign["status"], string> = {
    DRAFT: "Review",
    READY: "Review",
    APPROVED: "Approved",
    SCHEDULED: "Queued",
    LAUNCHED: "Launched",
    COMPLETED: "Completed",
  };

  return labels[status];
}

function mapAssetTypesToPlatforms(assetTypes?: string[]): string[] {
  if (!assetTypes || assetTypes.length === 0) return [];

  const mapping: Record<string, string> = {
    GOOGLE_BUSINESS: "Google Business Profile",
    META: "Facebook & Instagram",
    GOOGLE_ADS: "Google Ads",
    YELP: "Yelp",
    EMAIL: "Email",
    BLOG: "Blog",
    AEO_FAQ: "AEO / FAQ",
    ANSWER_SNIPPET: "Answer Snippet",
    SEO: "SEO Content",
  };

  return Array.from(new Set(assetTypes.map((type) => mapping[type] ?? type)));
}

function getApprovedPlatforms(
  campaign: CampaignWithExecution,
  execution: ExecutionMeta | null
): string[] {
  const approvedAssetTypesFromAssets = campaign.campaignAssets
    .filter((asset) => asset.isApproved)
    .map((asset) => asset.assetType);

  const approvedPlatformsFromAssets = mapAssetTypesToPlatforms(
    approvedAssetTypesFromAssets
  );
  if (approvedPlatformsFromAssets.length > 0) {
    return approvedPlatformsFromAssets;
  }

  const approvedPlatformsFromExecution = mapAssetTypesToPlatforms(
    execution?.approvedAssetTypes
  );
  if (approvedPlatformsFromExecution.length > 0) {
    return approvedPlatformsFromExecution;
  }

  if (execution?.launchPlatform) {
    return [execution.launchPlatform];
  }

  return [];
}

export function ExecutionCard({ campaign }: Props) {
  const execution = getExecutionMeta(campaign.briefJson);
  const estimatedRange = extractEstimatedRange(campaign.briefJson);
  const approvedPlatforms = getApprovedPlatforms(campaign, execution);

  const jobsDisplay =
    estimatedRange?.jobsLow != null && estimatedRange?.jobsHigh != null
      ? `${estimatedRange.jobsLow}–${estimatedRange.jobsHigh}`
      : campaign.estimatedBookedJobs != null
        ? String(campaign.estimatedBookedJobs)
        : "—";

  const revenueDisplay =
    estimatedRange?.revenueHigh != null
      ? estimatedRange.revenueHigh
      : typeof campaign.estimatedRevenue === "number"
        ? campaign.estimatedRevenue
        : 0;

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
            {jobsDisplay}
          </p>
        </div>

        <div className="rounded-xl bg-gray-50 p-3">
          <p className="text-[10px] uppercase tracking-wide text-gray-500">
            Est Revenue
          </p>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            ${revenueDisplay.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm text-gray-700">
        <p>
          <span className="font-semibold text-gray-900">Platforms:</span>{" "}
          {approvedPlatforms.length > 0
            ? approvedPlatforms.join(", ")
            : "No approved platforms yet"}
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