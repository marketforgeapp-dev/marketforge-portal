"use client";

import { useState } from "react";
import Image from "next/image";
import { SelectedOpportunity } from "@/lib/select-revenue-opportunities";
import { getActionImage } from "@/lib/action-imagery";
import { ActionLaunchButton } from "@/components/campaigns/action-launch-button";
import { SystemStatusOverlay } from "@/components/system/system-status-overlay";
import { getRecommendedActionBudget } from "@/lib/budget-allocation-recommendations";

type Props = {
  opportunities: SelectedOpportunity[];
  logoUrl?: string | null;
  industryLabel?: string | null;
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
  if (!opportunity.linkedCampaignStatus) return "Draft Ready";

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

function formatActionType(value: string) {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function OpportunityPreviewTile({
  opportunity,
  logoUrl,
  industryLabel,
}: {
  opportunity: SelectedOpportunity;
  logoUrl?: string | null;
  industryLabel?: string | null;
}) {
const image = getActionImage({
  industry: industryLabel,
  familyKey: opportunity.familyKey,
  imageKey: opportunity.imageKey,
  imageMode: opportunity.imageMode,
  logoUrl,
});

  const isRemote = image.src.startsWith("http");

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="relative aspect-[4/3]">
        {isRemote ? (
          <img src={image.src} alt={image.alt} className="h-full w-full object-cover" />
        ) : (
          <Image src={image.src} alt={image.alt} fill className="object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/90">
            Action Preview
          </span>

          <p className="mt-3 max-w-[16rem] text-lg font-semibold leading-tight">
            {opportunity.displayMoveLabel}
          </p>

          <p className="mt-2 max-w-[16rem] text-sm leading-5 text-white/90">
            {opportunity.displaySummary}
          </p>
        </div>
      </div>
    </div>
  );
}

export function OpportunitiesGrid({ opportunities, logoUrl, industryLabel }: Props) {
    const [showGeneratingOverlay, setShowGeneratingOverlay] = useState(false);
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
    <>
      <div className="grid gap-4">
                {opportunities.map((opportunity, index) => {
          const actionBudget = getRecommendedActionBudget({
            revenueLow: opportunity.revenueLow,
            revenueHigh: opportunity.revenueHigh,
            actionFraming: opportunity.actionFraming,
            opportunityType: opportunity.opportunityType,
          });

          return (
            <section
              key={opportunity.opportunityKey}
              className="mf-card rounded-3xl p-4 md:p-5"
            >
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-gray-900 px-2.5 py-1 text-[10px] font-semibold text-white">
                    #{index + 1} Next Best Action
                  </span>

                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#B07A12]">
                    {getOpportunityLabel(opportunity.opportunityType)}
                  </span>

                  <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700">
                    Action Budget ${actionBudget.toLocaleString()}
                  </span>

                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-semibold text-gray-700">
                    {getStatusLabel(opportunity)}
                  </span>
                </div>

                <div>
                  <p className="text-xl font-bold tracking-tight text-gray-900">
                    {opportunity.displayMoveLabel}
                  </p>

                  <p className="mt-1 text-base text-gray-700">
                    {opportunity.displaySummary}
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
                  <ActionLaunchButton
                    opportunityKey={opportunity.opportunityKey}
                    linkedCampaignId={opportunity.linkedCampaignId}
                    onStart={() => setShowGeneratingOverlay(true)}
                    onError={() => setShowGeneratingOverlay(false)}
                    className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  />
                </div>
              </div>

              <OpportunityPreviewTile
  opportunity={opportunity}
  logoUrl={logoUrl}
  industryLabel={industryLabel}
/>
            </div>
                    </section>
          );
        })}
      </div>

      <SystemStatusOverlay
        mode="generating"
        visible={showGeneratingOverlay}
      />
    </>
  );
}