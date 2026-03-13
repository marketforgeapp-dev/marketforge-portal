import Link from "next/link";
import { CampaignStatus, OpportunityType } from "@/generated/prisma";

type HeaderCampaign = {
  id: string;
  name: string;
  status: CampaignStatus;
  estimatedLeads: number | null;
  estimatedBookedJobs: number | null;
  estimatedRevenue: number;
  targetService: string | null;
  recommendationTitle: string | null;
  opportunityTitle: string | null;
  opportunityType: OpportunityType | null;
  userPrompt?: string | null;
  matchedOpportunityTitle?: string | null;
  nextBestActionTitle?: string | null;
  nextBestActionType?: string | null;
  executionMode?: string | null;
};

type HeaderResults = {
  totalLeads: number;
  bookedJobs: number;
  revenueSoFar: number;
};

type Props = {
  campaign: HeaderCampaign;
  results: HeaderResults;
};

const STATUS_LABELS: Record<CampaignStatus, string> = {
  DRAFT: "Draft Ready",
  READY: "Draft Ready",
  APPROVED: "Approved",
  SCHEDULED: "Queued",
  LAUNCHED: "Launched",
  COMPLETED: "Completed",
};

const OPPORTUNITY_TYPE_LABELS: Record<OpportunityType, string> = {
  SEASONAL_DEMAND: "Seasonal Demand",
  COMPETITOR_INACTIVE: "Competitor Gap",
  CAPACITY_GAP: "Capacity Fill",
  HIGH_VALUE_SERVICE: "High-Value Service",
  AI_SEARCH_VISIBILITY: "AI Search Visibility",
  REVIEW_SENTIMENT_SHIFT: "Review Recovery",
  LOCAL_SEARCH_SPIKE: "Local Demand",
};

function formatActionType(value?: string | null) {
  if (!value) return "Not recorded";

  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatExecutionMode(value?: string | null) {
  if (!value) return "Not recorded";

  return value === "ACTION_PACK" ? "Action Pack" : "Campaign Launch";
}

export function CampaignDetailHeader({ campaign, results }: Props) {
  const estimatedRevenue = Number(campaign.estimatedRevenue ?? 0);

  return (
    <section className="mf-card rounded-3xl p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600">
            Action Detail
          </p>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
            {campaign.name}
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
            Review the matched opportunity, confirm the action package, and move
            the work into execution when it is ready.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/api/export-pack/${campaign.id}`}
            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            Export Launch Pack
          </Link>

          <span className="rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">
            {STATUS_LABELS[campaign.status]}
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
            Opportunity → Action → Revenue
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-white p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                Opportunity
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {campaign.opportunityTitle ??
                  campaign.matchedOpportunityTitle ??
                  "Not linked"}
              </p>
              <p className="mt-1 text-xs text-gray-600">
                {campaign.opportunityType
                  ? OPPORTUNITY_TYPE_LABELS[campaign.opportunityType]
                  : "No opportunity type available"}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                Recommended Action
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {campaign.nextBestActionTitle ??
                  campaign.recommendationTitle ??
                  campaign.name}
              </p>
              <p className="mt-1 text-xs text-gray-600">
                {campaign.targetService ?? "General service action"}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                Results So Far
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {results.bookedJobs} booked jobs
              </p>
              <p className="mt-1 text-xs text-gray-600">
                ${results.revenueSoFar.toLocaleString()} revenue
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-[10px] uppercase tracking-wide text-gray-500">
              Estimated Leads
            </p>
            <p className="mt-1 text-base font-semibold text-gray-900">
              {campaign.estimatedLeads ?? 0}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-[10px] uppercase tracking-wide text-gray-500">
              Estimated Jobs
            </p>
            <p className="mt-1 text-base font-semibold text-gray-900">
              {campaign.estimatedBookedJobs ?? 0}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-[10px] uppercase tracking-wide text-gray-500">
              Estimated Revenue
            </p>
            <p className="mt-1 text-base font-semibold text-gray-900">
              ${estimatedRevenue.toLocaleString()}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-[10px] uppercase tracking-wide text-gray-500">
              Total Leads So Far
            </p>
            <p className="mt-1 text-base font-semibold text-gray-900">
              {results.totalLeads}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700">
          Generation Record
        </p>

        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-white p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Execution Mode
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {formatExecutionMode(campaign.executionMode)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Action Type
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {formatActionType(campaign.nextBestActionType)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Action Title
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {campaign.nextBestActionTitle ?? "Not recorded"}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Matched Opportunity
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {campaign.matchedOpportunityTitle ?? "Not recorded"}
            </p>
          </div>
        </div>

        <div className="mt-3 rounded-2xl bg-white p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            Original Prompt
          </p>
          <p className="mt-1 text-sm text-gray-800">
            {campaign.userPrompt ?? "Not recorded"}
          </p>
        </div>
      </div>
    </section>
  );
}