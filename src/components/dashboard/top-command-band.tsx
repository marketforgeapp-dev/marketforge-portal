"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { RevenueOpportunityHero } from "@/lib/revenue-opportunity-engine";
import { getActionImage } from "@/lib/action-imagery";
import { ActionLaunchButton } from "@/components/campaigns/action-launch-button";
import { SystemStatusOverlay } from "@/components/system/system-status-overlay";
import { getRecommendedActionBudget } from "@/lib/budget-allocation-recommendations";

type HeroCampaignData = {
  id: string;
  name: string;
  status: string;
  targetService: string | null;
  offer: string | null;
  audience: string | null;
  briefJson: unknown;
  assets: {
    id: string;
    assetType: string;
    title: string | null;
    content: string;
  }[];
} | null;

type Props = {
  hero: RevenueOpportunityHero;
  heroCampaign: HeroCampaignData;
  logoUrl?: string | null;
  industryLabel?: string | null;
};

type CampaignBriefData = {
  actionSpec?: {
    constructType?: string;
    targetAudience?: string;
    offerLabel?: string | null;
    cta?: string;
    whatHappensWhenLaunched?: string;
  };
  campaignDraft?: {
    description?: string;
    offer?: string;
    audience?: string;
    cta?: string;
  };
  actionThesis?: {
    title?: string;
    summary?: string;
    audience?: string;
    offerHint?: string;
    ctaHint?: string;
    imageKey?: string;
    imageMode?: "SERVICE_IMAGE" | "LOGO";
  };
};

function getBriefData(raw: unknown): CampaignBriefData | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as CampaignBriefData;
}

function formatCurrencyRange(low: number, high: number) {
  return `$${low.toLocaleString()}–$${high.toLocaleString()}`;
}

function formatActionFraming(value: string) {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatSignalLevel(value: string) {
  switch (value) {
    case "HIGH":
      return "High";
    case "MEDIUM":
      return "Medium";
    case "LOW":
      return "Low";
    default:
      return value;
  }
}

function formatCapacityFit(value: string) {
  switch (value) {
    case "HIGH":
      return "Strong";
    case "MEDIUM":
      return "Moderate";
    case "LOW":
      return "Limited";
    default:
      return value;
  }
}

function formatActionTypeLabel(value: string) {
  switch (value) {
    case "PAID_CAMPAIGN":
      return "Job Generation";
    case "SCHEDULE_FILL":
      return "Schedule Fill";
    case "REPUTATION":
      return "Proof & Credibility";
    case "PROMOTION":
      return "Higher-Value Service";
    case "LOCAL_VISIBILITY":
      return "Local Visibility";
    case "AEO_CONTENT":
      return "Online Visibility";
    case "MIXED":
      return "Growth Action";
    default:
      return formatActionFraming(value);
  }
}

function humanizeReasonText(value?: string | null) {
  const text = (value ?? "").trim();

  if (!text) return "No additional insight recorded yet.";

  return text
    .replace(/\bAI search visibility\b/gi, "how homeowners find you online")
    .replace(/\banswer-engine\b/gi, "online search")
    .replace(/\baction framing\b/gi, "recommended move")
    .replace(/\bvariant\b/gi, "approach")
    .replace(/\bcommercial offer\b/gi, "customer offer")
    .replace(/\bpremium positioning\b/gi, "higher-value positioning")
    .replace(/\bhomeowner intent\b/gi, "likelihood homeowners will act")
    .replace(/\s+/g, " ")
    .trim();
}

function getStatusLabel(heroCampaign: HeroCampaignData) {
  if (!heroCampaign) return "Not Generated";

  switch (heroCampaign.status) {
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
      return heroCampaign.status;
  }
}

export function TopCommandBand({ hero, heroCampaign, logoUrl, industryLabel }: Props) {
  const brief = getBriefData(heroCampaign?.briefJson);
    const [showGeneratingOverlay, setShowGeneratingOverlay] = useState(false);

    const offerText =
    brief?.actionSpec?.offerLabel ??
    heroCampaign?.offer ??
    brief?.campaignDraft?.offer ??
    "No special offer";

  const audienceText =
    brief?.actionSpec?.targetAudience ??
    heroCampaign?.audience ??
    brief?.campaignDraft?.audience ??
    brief?.actionThesis?.audience ??
    "Audience guidance will populate when the action package is generated.";

  const ctaText =
    brief?.actionSpec?.cta ??
    brief?.campaignDraft?.cta ??
    brief?.actionThesis?.ctaHint ??
    "Book now";

  const actionBudget = getRecommendedActionBudget({
    assetTypes: heroCampaign?.assets.map((asset) => asset.assetType) ?? [],
    revenueLow: hero.revenueLow,
    revenueHigh: hero.revenueHigh,
    actionFraming: hero.actionFraming,
    opportunityType: hero.opportunityType,
  });

    const image = getActionImage({
        industry: industryLabel,
        familyKey: hero.familyKey,
        imageKey: brief?.actionThesis?.imageKey ?? hero.imageKey,
        imageMode: brief?.actionThesis?.imageMode ?? hero.imageMode,
        logoUrl,
      });
  return (
        <>
      <section className="mf-card mf-card-highlight rounded-3xl p-4 md:p-5">
        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B07A12]">
                Top Priority Action
              </p>

              <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700">
                Action Budget ${actionBudget.toLocaleString()}
              </span>

              <span className="rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-semibold text-gray-700">
                {getStatusLabel(heroCampaign)}
              </span>
            </div>

            <div>
              <p className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
                {hero.displayMoveLabel}
              </p>

              <p className="mt-1.5 text-base text-gray-700 md:text-lg">
                {hero.displaySummary}
              </p>

              <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
                  {hero.jobsLow}–{hero.jobsHigh} Jobs
                </p>

                <p className="text-base font-semibold text-gray-700">
                  • {formatCurrencyRange(hero.revenueLow, hero.revenueHigh)}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                Why Now
              </p>

              <ul className="mt-2 space-y-1.5 text-sm leading-5 text-gray-800">
                {hero.whyNowBullets.slice(0, 3).map((bullet) => (
                  <li key={bullet} className="flex gap-2">
                    <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-emerald-600" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>

                        <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Time Sensitivity
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {formatSignalLevel(hero.urgencyRelevance)}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Likelihood to Act
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {formatSignalLevel(hero.homeownerIntentStrength)}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Room in Schedule
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {formatCapacityFit(hero.capacityFit)}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Recommended Move
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {formatActionTypeLabel(hero.actionFraming)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <ActionLaunchButton
                opportunityKey={hero.opportunityKey}
                linkedCampaignId={heroCampaign?.id}
                onStart={() => setShowGeneratingOverlay(true)}
                onError={() => setShowGeneratingOverlay(false)}
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                  Execution Package
                </p>

                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-semibold text-gray-700">
                  {heroCampaign?.assets.length ?? 0} assets
                </span>
              </div>

              <div className="mt-3 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="relative aspect-[4/3]">
                  {image.src.startsWith("http") ? (
                    <img src={image.src} alt={image.alt} className="h-full w-full object-cover" />
                  ) : (
                    <Image src={image.src} alt={image.alt} fill className="object-cover" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                    <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/90">
                      Launch-Ready
                    </span>
                    <p className="mt-3 max-w-[16rem] text-lg font-semibold leading-tight">
                      {hero.displayMoveLabel}
                    </p>
                    <p className="mt-2 max-w-[17rem] text-sm leading-5 text-white/90">
                      {brief?.actionThesis?.summary ?? hero.displaySummary}
                    </p>
                    <div className="pt-3">
                      <span className="inline-flex rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-900">
                        {heroCampaign ? ctaText : "Ready to Generate"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-gray-500">
                    Construct
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {brief?.actionSpec?.constructType
                      ? brief.actionSpec.constructType
                          .toLowerCase()
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (char) => char.toUpperCase())
                      : "Not recorded"}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-gray-500">
                    Offer
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {offerText}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-3 sm:col-span-2">
                  <p className="text-[10px] uppercase tracking-wide text-gray-500">
                    Audience
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {audienceText}
                  </p>
                </div>
              </div>
            </div>

                        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3.5 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                Why This Move Makes Sense
              </p>
              <div className="mt-2 space-y-2 text-sm leading-5 text-gray-700">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Timing
                  </p>
                  <p className="mt-1">
                    {humanizeReasonText(hero.seasonalityReason)}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Homeowner Behavior
                  </p>
                  <p className="mt-1">
                    {humanizeReasonText(hero.homeownerIntentReason)}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Why This Action
                  </p>
                  <p className="mt-1">
                    {humanizeReasonText(hero.actionFramingReason)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SystemStatusOverlay
        mode="generating"
        visible={showGeneratingOverlay}
      />
    </>
  );
}