"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CampaignStatus } from "@/generated/prisma";
import { saveCampaignBriefEdits } from "@/app/campaigns/[campaignId]/actions";
import { getActionImage } from "@/lib/action-imagery";

type CampaignBriefData = {
  userPrompt?: string;
  matchedFamilyKey?: string | null;
  structuredIndustry?: string | null;
  imageKey?: string | null;
  imageMode?: "SERVICE_IMAGE" | "LOGO" | null;
    actionSpec?: {
    constructType?: string;
    secondaryConstructType?: string | null;
    businessGoal?: string;
    actionName?: string;
    targetService?: string;
    targetAudience?: string;
    audienceRationale?: string;
    audienceSourceType?: string;
    offerType?: string;
    offerLabel?: string | null;
    offerValue?: string | null;
    offerDuration?: string | null;
    offerConditions?: string | null;
    offerFulfillmentNotes?: string | null;
    coreMessageAngle?: string;
    cta?: string;
    proofOrDifferentiator?: string | null;
    messageGuardrails?: string[];
    whatHappensWhenLaunched?: string;
    executionMode?: string;
    automationEligibility?: string;
    executionMechanism?: {
      channelType?: string;
      triggerType?: string;
      deliverySurface?: string;
      operatorActionSummary?: string;
      requiredAssets?: string[];
      requiredAccess?: string[];
      manualSteps?: string[];
      futureAutomationHook?: string;
    };
    operationalDependencies?: {
      business_readiness?: string[];
      offer_readiness?: string[];
      asset_readiness?: string[];
      channel_access?: string[];
      tracking_readiness?: string[];
      staff_behavior?: string[];
      website_or_landing_readiness?: string[];
    };
    targeting?: {
      mode?: string;
      base?: {
        geography?: {
          type?: string;
          value?: string[];
        };
        service?: {
          primary?: string;
          demandType?: string;
        };
        businessType?: string;
        constraints?: string[];
      };
      intent?: {
        level?: string;
        purchaseUrgency?: number;
        conversionLikelihood?: number;
        rationale?: string;
      };
      economics?: {
        jobValueTier?: string;
        estimatedTicket?: number | null;
        rationale?: string;
      };
      wasteControls?: {
        excludeLowIntent?: boolean;
        excludeDIY?: boolean;
        excludeRenters?: boolean;
        negativeKeywordThemes?: string[];
        notes?: string[];
      };
      platforms?: {
        googleAds?: {
          locationTargets?: string[];
          keywordThemes?: string[];
          negativeKeywordThemes?: string[];
          audienceObservationHints?: string[];
          biddingFocus?: string;
          notes?: string[];
        };
        meta?: {
          locationTargets?: string[];
          ageRange?: [number, number] | null;
          homeownerFocus?: boolean;
          interestThemes?: string[];
          exclusions?: string[];
          notes?: string[];
        };
        googleBusinessProfile?: {
          locationTargets?: string[];
          localIntentFocus?: string;
          primaryServiceFocus?: string;
          postAngle?: string;
          visibilityGoal?: string;
          notes?: string[];
        };
      };
      summary?: {
        audienceDescription?: string;
        rationale?: string;
        notes?: string[];
      };
      execution?: {
        googleAds?: string[];
        meta?: string[];
        googleBusinessProfile?: string[];
      };
    };
  };
  parsedIntent?: {
    serviceCategory?: string;
    intent?: string;
    urgency?: string;
    timeframe?: string;
    promotionType?: string;
  };
  opportunityCheck?: {
    matchedOpportunityTitle?: string | null;
    matchedRecommendationTitle?: string | null;
    confidenceScore?: number;
    sourceTags?: string[];
    whyNowBullets?: string[];
    whyThisMatters?: string;
    rationale?: string;
  };
  nextBestAction?: {
    actionType?: string;
    executionMode?: string;
    title?: string;
  };
  actionThesis?: {
    title?: string;
    summary?: string;
    audience?: string;
    offerHint?: string;
    ctaHint?: string;
    imageKey?: string;
    imageMode?: "SERVICE_IMAGE" | "LOGO";
    whyThisActionBullets?: string[];
  };
  campaignDraft?: {
    description?: string;
    offer?: string;
    audience?: string;
    cta?: string;
  };
  creativeGuidance?: {
    recommendedImage?: string;
    avoidImagery?: string;
  };
};

type Props = {
  campaignId: string;
  status: CampaignStatus;
  campaignName: string;
  targetService: string | null;
  offer: string | null;
  audience: string | null;
  briefJson: unknown;
  logoUrl?: string | null;
  industryLabel?: string | null;
};

function parseBriefJson(value: unknown): CampaignBriefData | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as CampaignBriefData;
}

function formatIntent(value?: string) {
  return value ?? "Not recorded";
}

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

function formatLabel(value?: string | null) {
  if (!value) return "Not recorded";

  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function CampaignBriefPanel({
  campaignId,
  status,
  campaignName,
  targetService,
  offer,
  audience,
  briefJson,
  logoUrl,
  industryLabel,
}: Props) {
  const parsed = parseBriefJson(briefJson);

  const actionSpec = parsed?.actionSpec;
  const targeting = actionSpec?.targeting;
  const googleAdsTargeting = targeting?.platforms?.googleAds;
  const metaTargeting = targeting?.platforms?.meta;
  const gbpTargeting = targeting?.platforms?.googleBusinessProfile;
  const parsedIntent = parsed?.parsedIntent;
  const opportunityCheck = parsed?.opportunityCheck;
  const actionThesis = parsed?.actionThesis;
  const campaignDraft = parsed?.campaignDraft;
  const creativeGuidance = parsed?.creativeGuidance;

  const confidence = opportunityCheck?.confidenceScore ?? null;

  const canEdit = status !== "LAUNCHED" && status !== "COMPLETED";

  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

    const [draftName, setDraftName] = useState(
    actionSpec?.actionName ?? campaignName
  );
  const [draftTargetService, setDraftTargetService] = useState(
    actionSpec?.targetService ?? targetService ?? ""
  );
  const [draftOffer, setDraftOffer] = useState(
    actionSpec?.offerLabel ?? campaignDraft?.offer ?? offer ?? ""
  );
  const [draftAudience, setDraftAudience] = useState(
    actionSpec?.targetAudience ?? campaignDraft?.audience ?? audience ?? ""
  );
  const [draftDescription, setDraftDescription] = useState(
    actionSpec?.coreMessageAngle ?? campaignDraft?.description ?? actionThesis?.summary ?? ""
  );
  const [draftCta, setDraftCta] = useState(
    actionSpec?.cta ?? campaignDraft?.cta ?? actionThesis?.ctaHint ?? ""
  );
  const [draftRecommendedImage, setDraftRecommendedImage] = useState(
    creativeGuidance?.recommendedImage ?? ""
  );
  const [draftAvoidImagery, setDraftAvoidImagery] = useState(
    creativeGuidance?.avoidImagery ?? ""
  );

  const image = getActionImage({
    industry: parsed?.structuredIndustry ?? undefined,
    workspaceIndustry: industryLabel,
    familyKey: parsed?.matchedFamilyKey ?? parsedIntent?.serviceCategory ?? null,
    imageKey: parsed?.imageKey ?? actionThesis?.imageKey ?? null,
    imageMode:
      parsed?.imageMode ?? actionThesis?.imageMode ?? "SERVICE_IMAGE",
    logoUrl,
  });

  const whyBullets =
    actionThesis?.whyThisActionBullets?.length
      ? actionThesis.whyThisActionBullets
      : opportunityCheck?.whyNowBullets ?? [];

  return (
    <section className="mf-card rounded-3xl p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
            Action Details
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-gray-900">
            Action structure and execution context
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
            Review who this action is for, what it is promoting, and what is
            required to execute it cleanly.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {canEdit && isExpanded && !isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Edit Action
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setIsExpanded((current) => !current)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            {isExpanded ? "Hide Action Details" : "Show Action Details"}
          </button>
        </div>
      </div>

      {!isExpanded ? null : (
        <>
          {isEditing ? (
            <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-gray-900">
                Edit action before approval or launch
              </p>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      Action Name
                    </label>
                    <input
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      Target Service
                    </label>
                    <input
                      value={draftTargetService}
                      onChange={(e) => setDraftTargetService(e.target.value)}
                      className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      Offer
                    </label>
                    <input
                      value={draftOffer}
                      onChange={(e) => setDraftOffer(e.target.value)}
                      className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      Audience
                    </label>
                    <input
                      value={draftAudience}
                      onChange={(e) => setDraftAudience(e.target.value)}
                      className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      CTA
                    </label>
                    <input
                      value={draftCta}
                      onChange={(e) => setDraftCta(e.target.value)}
                      className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      Description
                    </label>
                    <textarea
                      value={draftDescription}
                      onChange={(e) => setDraftDescription(e.target.value)}
                      rows={5}
                      className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      Recommended Image
                    </label>
                    <textarea
                      value={draftRecommendedImage}
                      onChange={(e) => setDraftRecommendedImage(e.target.value)}
                      rows={3}
                      className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      Avoid Imagery
                    </label>
                    <textarea
                      value={draftAvoidImagery}
                      onChange={(e) => setDraftAvoidImagery(e.target.value)}
                      rows={3}
                      className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      await saveCampaignBriefEdits({
                        campaignId,
                        name: draftName,
                        targetService: draftTargetService,
                        offer: draftOffer,
                        audience: draftAudience,
                        description: draftDescription,
                        cta: draftCta,
                        recommendedImage: draftRecommendedImage,
                        avoidImagery: draftAvoidImagery,
                      });
                      setIsEditing(false);
                      router.refresh();
                    })
                  }
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {isPending ? "Saving..." : "Save Action Edits"}
                </button>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setIsEditing(false)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_1fr]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Opportunity Match
                </p>

                <p className="mt-2 text-sm font-semibold text-gray-900">
                  {opportunityCheck?.matchedRecommendationTitle ??
                    actionThesis?.title ??
                    "No strong opportunity match"}
                </p>

                <p className="mt-2 text-sm leading-5 text-gray-600">
                  {opportunityCheck?.matchedOpportunityTitle
                    ? `Built from ${opportunityCheck.matchedOpportunityTitle}.`
                    : "Built directly from your request."}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Generation Record
                </p>

                <div className="mt-2 space-y-2 text-sm text-gray-900">
                  <p>
                    Execution Mode:{" "}
                    {formatExecutionMode(parsed?.nextBestAction?.executionMode)}
                  </p>
                  <p>
                    Action Type:{" "}
                    {formatActionType(parsed?.nextBestAction?.actionType)}
                  </p>
                  <p>
                    Action Title:{" "}
                    {parsed?.nextBestAction?.title ??
                      actionThesis?.title ??
                      campaignName}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Original Prompt
                </p>

                <p className="mt-2 text-sm leading-6 text-gray-700">
                  {parsed?.userPrompt ?? "Not recorded"}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Confidence
                </p>

                <p className="mt-2 text-sm font-semibold text-gray-900">
                  MarketForge Action Score
                  {typeof confidence === "number"
                    ? ` ${Math.round(confidence)}`
                    : " —"}
                </p>

                <p className="mt-2 text-sm leading-5 text-gray-600">
                  This score reflects how strongly MarketForge believes this
                  action fits the current demand, competitive context, and
                  execution opportunity.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Signal Mix
                </p>

                <p className="mt-2 text-sm text-gray-900">
                  {Array.isArray(opportunityCheck?.sourceTags)
                    ? opportunityCheck.sourceTags.join(" • ")
                    : "No signals recorded"}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Intent Read
                </p>

                <div className="mt-2 space-y-1 text-sm text-gray-700">
                  <p>Intent: {formatIntent(parsedIntent?.intent)}</p>
                  <p>Urgency: {formatIntent(parsedIntent?.urgency)}</p>
                  <p>Timeframe: {formatIntent(parsedIntent?.timeframe)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Visual Preview
                </p>

                <div className="mt-3 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <div className="relative aspect-[4/3]">
                    {image.src.startsWith("http") ? (
                      <img
                        src={image.src}
                        alt={image.alt}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Image
                        src={image.src}
                        alt={image.alt}
                        fill
                        className="object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                      <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/90">
                        Action Preview
                      </span>
                      <p className="mt-3 max-w-[18rem] text-xl font-semibold leading-tight">
                        {actionThesis?.title ?? campaignName}
                      </p>
                      <p className="mt-2 max-w-[18rem] text-sm leading-5 text-white/90">
                        {actionThesis?.summary ??
                          campaignDraft?.description ??
                          "Action messaging will appear here once the brief is fully defined."}
                      </p>
                      <div className="pt-3">
                        <span className="inline-flex rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-900">
                          {(isEditing ? draftCta : campaignDraft?.cta) ||
                            actionThesis?.ctaHint ||
                            "Book now"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="mt-3 text-sm font-semibold text-gray-900">
                  Recommended Image
                </p>
                <p className="mt-1 text-sm leading-6 text-gray-700">
                  {(isEditing
                    ? draftRecommendedImage
                    : creativeGuidance?.recommendedImage) || "—"}
                </p>

                <p className="mt-3 text-sm font-semibold text-gray-900">
                  Avoid
                </p>
                <p className="mt-1 text-sm leading-6 text-gray-700">
                  {(isEditing
                    ? draftAvoidImagery
                    : creativeGuidance?.avoidImagery) || "—"}
                </p>
              </div>

                            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Action Structure
                </p>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-white p-3">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">
                      Construct Type
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {formatLabel(actionSpec?.constructType)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-3">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">
                      Business Goal
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {formatLabel(actionSpec?.businessGoal)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-3 sm:col-span-2">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">
                      Target Audience
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {(isEditing ? draftAudience : actionSpec?.targetAudience) ||
                        campaignDraft?.audience ||
                        actionThesis?.audience ||
                        "—"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-gray-700">
                      {actionSpec?.audienceRationale || "No audience rationale stored."}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-3 sm:col-span-2">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">
                      Offer
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {(isEditing ? draftOffer : actionSpec?.offerLabel) ||
                        "No special offer"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-gray-700">
                      Type: {formatLabel(actionSpec?.offerType)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-3 sm:col-span-2">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">
                      Core Message Angle
                    </p>
                    <p className="mt-1 text-sm text-gray-900">
                      {(isEditing ? draftDescription : actionSpec?.coreMessageAngle) ||
                        campaignDraft?.description ||
                        actionThesis?.summary ||
                        "—"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-3 sm:col-span-2">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">
                      CTA
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {(isEditing ? draftCta : actionSpec?.cta) ||
                        campaignDraft?.cta ||
                        actionThesis?.ctaHint ||
                        "—"}
                    </p>
                  </div>
                </div>
              </div>
                            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Targeting Readout
                </p>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-white p-3">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">
                      Targeting Mode
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {formatLabel(targeting?.mode)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-3">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">
                      Intent Level
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {formatLabel(targeting?.intent?.level)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-3">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">
                      Demand Type
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {formatLabel(targeting?.base?.service?.demandType)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-3">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">
                      Job Value Tier
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {formatLabel(targeting?.economics?.jobValueTier)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-3 sm:col-span-2">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">
                      Location
                    </p>
                    <p className="mt-1 text-sm text-gray-900">
                      {targeting?.base?.geography?.value?.join(", ") || "Not recorded"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-3 sm:col-span-2">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">
                      Targeting Rationale
                    </p>
                    <p className="mt-1 text-sm text-gray-900">
                      {targeting?.summary?.rationale || "No targeting rationale stored."}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-3 sm:col-span-2">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">
                      Google Ads Keyword Themes
                    </p>
                    <p className="mt-1 text-sm text-gray-900">
                      {googleAdsTargeting?.keywordThemes?.join(", ") || "Not recorded"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-3 sm:col-span-2">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">
                      Waste Controls
                    </p>
                    <p className="mt-1 text-sm text-gray-900">
                      {targeting?.wasteControls?.negativeKeywordThemes?.join(", ") ||
                        "Not recorded"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-3">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">
                      Meta Age Range
                    </p>
                    <p className="mt-1 text-sm text-gray-900">
                      {metaTargeting?.ageRange
                        ? `${metaTargeting.ageRange[0]}-${metaTargeting.ageRange[1]}`
                        : "Broad / not constrained"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-3">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">
                      Homeowner Focus
                    </p>
                    <p className="mt-1 text-sm text-gray-900">
                      {metaTargeting?.homeownerFocus ? "Yes" : "No"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-3 sm:col-span-2">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">
                      Google Business Profile Angle
                    </p>
                    <p className="mt-1 text-sm text-gray-900">
                      {gbpTargeting?.postAngle || "Not recorded"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Execution Readout
                </p>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-white p-3">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">
                      Execution Mode
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {formatLabel(actionSpec?.executionMode)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-3">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">
                      Automation Eligibility
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {formatLabel(actionSpec?.automationEligibility)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-3 sm:col-span-2">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">
                      What Happens When Launched
                    </p>
                    <p className="mt-1 text-sm text-gray-900">
                      {actionSpec?.whatHappensWhenLaunched || "Not recorded"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Why This Action Exists
                </p>

                <ul className="mt-2 space-y-2 text-sm text-gray-900">
                  {whyBullets.length > 0 ? (
                    whyBullets.map((bullet) => <li key={bullet}>• {bullet}</li>)
                  ) : (
                    <li>• No explanation stored</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}