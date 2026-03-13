import Link from "next/link";
import { SelectedOpportunity } from "@/lib/select-revenue-opportunities";

type Props = {
  opportunities: SelectedOpportunity[];
};

function getOpportunityLabel(type: SelectedOpportunity["opportunityType"]) {
  switch (type) {
    case "SEASONAL_DEMAND":
      return "Seasonal Demand";
    case "HIGH_VALUE_SERVICE":
      return "High-Value Service";
    case "AI_SEARCH_VISIBILITY":
      return "AEO / Visibility";
    case "CAPACITY_GAP":
      return "Capacity Fill";
    case "COMPETITOR_INACTIVE":
      return "Competitor Gap";
    default:
      return "Local Opportunity";
  }
}

function getStatusLabel(opportunity: SelectedOpportunity) {
  if (!opportunity.linkedCampaignStatus) return "Not Generated";

  switch (opportunity.linkedCampaignStatus) {
    case "DRAFT":
      return "Draft Ready";
    case "APPROVED":
      return "Approved";
    case "SCHEDULED":
      return "Queued";
    case "LAUNCHED":
      return "Launched";
    case "COMPLETED":
      return "Completed";
    default:
      return opportunity.linkedCampaignStatus;
  }
}

function getPrimaryHref(opportunity: SelectedOpportunity) {
  return opportunity.linkedCampaignId
    ? `/campaigns/${opportunity.linkedCampaignId}`
    : "/campaigns";
}

function getPrimaryLabel(opportunity: SelectedOpportunity) {
  return opportunity.linkedCampaignId ? "Review Action" : "Generate Action";
}

function formatActionType(value: string) {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function shouldShowVisualPlaceholder(opportunity: SelectedOpportunity) {
  return opportunity.actionFraming !== "AEO_CONTENT";
}

function getVisualTheme(opportunity: SelectedOpportunity) {
  switch (opportunity.opportunityType) {
    case "SEASONAL_DEMAND":
      return {
        label: "Launch Preview",
        classes: "from-sky-900 via-blue-800 to-cyan-700",
      };
    case "HIGH_VALUE_SERVICE":
      return {
        label: "Launch Preview",
        classes: "from-amber-900 via-orange-800 to-yellow-700",
      };
    case "CAPACITY_GAP":
      return {
        label: "Launch Preview",
        classes: "from-emerald-900 via-green-800 to-teal-700",
      };
    case "COMPETITOR_INACTIVE":
      return {
        label: "Launch Preview",
        classes: "from-rose-900 via-red-800 to-orange-700",
      };
    case "AI_SEARCH_VISIBILITY":
      return {
        label: "Visibility Action",
        classes: "from-violet-900 via-fuchsia-800 to-indigo-700",
      };
    default:
      return {
        label: "Launch Preview",
        classes: "from-slate-800 via-slate-700 to-slate-900",
      };
  }
}

function OpportunityPreviewTile({
  opportunity,
}: {
  opportunity: SelectedOpportunity;
}) {
  const theme = getVisualTheme(opportunity);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br ${theme.classes} p-4 text-white shadow-sm`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.12),transparent_40%)]" />

      <div className="relative flex min-h-[220px] flex-col justify-between">
        <div>
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/90">
            {theme.label}
          </span>

          <p className="mt-3 max-w-[16rem] text-lg font-semibold leading-tight">
            {opportunity.bestMove}
          </p>
        </div>

        <div className="space-y-2">
          <p className="max-w-[16rem] text-sm leading-5 text-white/85">
            {opportunity.jobsLow}–{opportunity.jobsHigh} jobs • $
            {opportunity.revenueLow.toLocaleString()}–$
            {opportunity.revenueHigh.toLocaleString()}
          </p>

          <div className="pt-1">
            <span className="inline-flex rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-900">
              Ready to Launch
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OpportunitiesGrid({ opportunities }: Props) {
  if (opportunities.length === 0) {
    return (
      <div className="mf-card rounded-3xl p-5">
        <p className="text-sm font-semibold text-gray-900">
          No additional opportunities are being surfaced right now.
        </p>
        <p className="mt-2 text-sm text-gray-600">
          MarketForge is currently concentrating on the top priority action and
          suppressing items already in execution.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {opportunities.map((opportunity, index) => (
        <section
          key={opportunity.opportunityKey}
          className="mf-card rounded-3xl p-4 md:p-5"
        >
          <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
            {shouldShowVisualPlaceholder(opportunity) ? (
              <OpportunityPreviewTile opportunity={opportunity} />
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                  No Visual Preview Needed
                </p>
                <p className="mt-2 text-sm leading-5 text-gray-600">
                  This action is execution-focused and does not require a visual
                  launch preview.
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-gray-900 px-2.5 py-1 text-[10px] font-semibold text-white">
                  #{index + 1} Next Best Action
                </span>

                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#B07A12]">
                  {getOpportunityLabel(opportunity.opportunityType)}
                </span>

                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
                  {opportunity.confidenceScore}% {opportunity.confidenceLabel}
                </span>

                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-semibold text-gray-700">
                  {getStatusLabel(opportunity)}
                </span>
              </div>

              <div>
                <p className="text-xl font-bold tracking-tight text-gray-900">
                  {opportunity.title}
                </p>

                <p className="mt-1 text-base font-semibold text-gray-800">
                  {opportunity.bestMove}
                </p>

                <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="text-xl font-bold text-gray-900">
                    {opportunity.jobsLow}–{opportunity.jobsHigh} Jobs
                  </p>

                  <p className="text-base font-semibold text-gray-700">
                    • ${opportunity.revenueLow.toLocaleString()}–$
                    {opportunity.revenueHigh.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                  Why Now
                </p>

                <ul className="mt-2 space-y-1 text-sm text-gray-800">
                  {opportunity.whyNowBullets.slice(0, 3).map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-emerald-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-gray-200 bg-white p-3">
                  <p className="text-[10px] uppercase tracking-wide text-gray-500">
                    Urgency
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {opportunity.urgencyRelevance}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-3">
                  <p className="text-[10px] uppercase tracking-wide text-gray-500">
                    Intent
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {opportunity.homeownerIntentStrength}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-3">
                  <p className="text-[10px] uppercase tracking-wide text-gray-500">
                    Action Type
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {formatActionType(opportunity.actionFraming)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href={getPrimaryHref(opportunity)}
                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  {getPrimaryLabel(opportunity)}
                </Link>

                <Link
                  href="/execution"
                  className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Open Execution
                </Link>
              </div>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}