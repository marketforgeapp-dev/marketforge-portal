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
  DRAFT: "Draft",
  READY: "Draft Ready",
  APPROVED: "Approved",
  SCHEDULED: "Queued for Launch",
  LAUNCHED: "Launched",
  COMPLETED: "Completed",
};

const OPPORTUNITY_TYPE_LABELS: Record<OpportunityType, string> = {
  SEASONAL_DEMAND: "Seasonal Demand",
  COMPETITOR_INACTIVE: "Competitor Inactive",
  CAPACITY_GAP: "Capacity Gap",
  HIGH_VALUE_SERVICE: "High-Value Service",
  AI_SEARCH_VISIBILITY: "AI Search Visibility",
  REVIEW_SENTIMENT_SHIFT: "Review Sentiment Shift",
  LOCAL_SEARCH_SPIKE: "Local Search Spike",
};

export function CampaignDetailHeader({ campaign, results }: Props) {
  const estimatedRevenue = campaign.estimatedRevenue ?? 0;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            MarketForge Execution
          </p>

          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            {campaign.name}
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
            Review the revenue opportunity, confirm the recommended action, and
            move this campaign through managed launch.
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

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Opportunity → Action → Revenue
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Opportunity
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {campaign.opportunityTitle ?? "Not linked"}
              </p>
              <p className="mt-1 text-xs text-gray-600">
                {campaign.opportunityType
                  ? OPPORTUNITY_TYPE_LABELS[campaign.opportunityType]
                  : "No opportunity type available"}
              </p>
            </div>

            <div className="rounded-lg bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Recommended Action
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {campaign.recommendationTitle ?? campaign.name}
              </p>
              <p className="mt-1 text-xs text-gray-600">
                {campaign.targetService ?? "General service promotion"}
              </p>
            </div>

            <div className="rounded-lg bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
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

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-xs text-gray-600">Estimated Leads</p>
            <p className="mt-2 text-sm font-semibold text-gray-900">
              {campaign.estimatedLeads ?? 0}
            </p>
          </div>

          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-xs text-gray-600">Estimated Jobs</p>
            <p className="mt-2 text-sm font-semibold text-gray-900">
              {campaign.estimatedBookedJobs ?? 0}
            </p>
          </div>

          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-xs text-gray-600">Estimated Revenue</p>
            <p className="mt-2 text-sm font-semibold text-gray-900">
              ${estimatedRevenue.toLocaleString()}
            </p>
          </div>

          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-xs text-gray-600">Lead Volume</p>
            <p className="mt-2 text-sm font-semibold text-gray-900">
              {results.totalLeads}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}