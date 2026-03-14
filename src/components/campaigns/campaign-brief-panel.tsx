"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CampaignStatus } from "@/generated/prisma";
import { saveCampaignBriefEdits } from "@/app/campaigns/[campaignId]/actions";
import { getActionImage } from "@/lib/action-imagery";

type CampaignBriefData = {
  userPrompt?: string;
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

export function CampaignBriefPanel({
  campaignId,
  status,
  campaignName,
  targetService,
  offer,
  audience,
  briefJson,
  logoUrl,
}: Props) {
  const parsed = parseBriefJson(briefJson);

  const parsedIntent = parsed?.parsedIntent;
  const opportunityCheck = parsed?.opportunityCheck;
  const actionThesis = parsed?.actionThesis;
  const campaignDraft = parsed?.campaignDraft;
  const creativeGuidance = parsed?.creativeGuidance;

  const confidence = opportunityCheck?.confidenceScore ?? null;

  let confidenceLabel = "Early Signal";
  if (confidence && confidence >= 85) confidenceLabel = "High Confidence";
  else if (confidence && confidence >= 70) confidenceLabel = "Strong Signal";
  else if (confidence && confidence >= 55) confidenceLabel = "Moderate Signal";

  const canEdit = status !== "LAUNCHED" && status !== "COMPLETED";

  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);

  const [draftName, setDraftName] = useState(campaignName);
  const [draftTargetService, setDraftTargetService] = useState(
    targetService ?? ""
  );
  const [draftOffer, setDraftOffer] = useState(
    campaignDraft?.offer ?? offer ?? ""
  );
  const [draftAudience, setDraftAudience] = useState(
    campaignDraft?.audience ?? audience ?? ""
  );
  const [draftDescription, setDraftDescription] = useState(
    campaignDraft?.description ?? actionThesis?.summary ?? ""
  );
  const [draftCta, setDraftCta] = useState(
    campaignDraft?.cta ?? actionThesis?.ctaHint ?? ""
  );
  const [draftRecommendedImage, setDraftRecommendedImage] = useState(
    creativeGuidance?.recommendedImage ?? ""
  );
  const [draftAvoidImagery, setDraftAvoidImagery] = useState(
    creativeGuidance?.avoidImagery ?? ""
  );

  const image = getActionImage({
  imageKey: actionThesis?.imageKey,
  imageMode: actionThesis?.imageMode,
  logoUrl,
});

  const whyBullets =
    actionThesis?.whyThisActionBullets?.length
      ? actionThesis.whyThisActionBullets
      : opportunityCheck?.whyNowBullets ?? [];
  return (
    <section className="mf-card rounded-3xl p-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600">
          Action Brief
        </p>

        {canEdit && !isEditing ? (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Edit Action
          </button>
        ) : null}
      </div>

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
              Confidence
            </p>

            <p className="mt-2 text-sm font-semibold text-gray-900">
              MarketForge Action Score
              {typeof confidence === "number" ? ` ${Math.round(confidence)}` : " —"}
            </p>

            <p className="mt-2 text-sm leading-5 text-gray-600">
              This score reflects how strongly MarketForge believes this action fits the current demand, competitive context, and execution opportunity.
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
    <img src={image.src} alt={image.alt} className="h-full w-full object-cover" />
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

            <p className="mt-3 text-sm font-semibold text-gray-900">Avoid</p>
            <p className="mt-1 text-sm leading-6 text-gray-700">
              {(isEditing ? draftAvoidImagery : creativeGuidance?.avoidImagery) || "—"}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Action Strategy
            </p>

            <div className="mt-2 space-y-2 text-sm text-gray-900">
              <p>
                Description:{" "}
                {(isEditing ? draftDescription : campaignDraft?.description) ||
                  actionThesis?.summary ||
                  "—"}
              </p>
              <p>
                Offer:{" "}
                {(isEditing ? draftOffer : campaignDraft?.offer) ||
                  actionThesis?.offerHint ||
                  "—"}
              </p>
              <p>
                Audience:{" "}
                {(isEditing ? draftAudience : campaignDraft?.audience) ||
                  actionThesis?.audience ||
                  "—"}
              </p>
              <p>
                CTA:{" "}
                {(isEditing ? draftCta : campaignDraft?.cta) ||
                  actionThesis?.ctaHint ||
                  "—"}
              </p>
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
    </section>
  );
}