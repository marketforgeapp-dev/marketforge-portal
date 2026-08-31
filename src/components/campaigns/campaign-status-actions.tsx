"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SystemStatusOverlay } from "@/components/system/system-status-overlay";
import {
  approveCampaign,
  queueCampaignForLaunch,
  resetCampaignToReview,
  type ApproveCampaignResult,
} from "@/app/campaigns/[campaignId]/actions";
import {
  markCampaignLaunched,
  markCampaignCompleted,
} from "@/app/execution/actions";
import { CampaignStatus } from "@/generated/prisma";

type ParsedBrief = {
  market?: string;

  commercialActionSpec?: {
    expectedOutcome?: string;
    primaryCallToAction?: string;
    launchMode?: string;

    target?: {
      displayLabel?: string;
      relationshipGoal?: string;
    };
  };

  websiteIntelligence?: {
    gapType?: string;
    summary?: string;
    whyItMatters?: string;
    recommendedImprovement?: string;
  };

  actionThesis?: {
    title?: string;
  };
  displayMoveLabel?: string;
  nextBestAction?: {
    title?: string;
  };
  estimatedRange?: {
    jobsLow?: number;
    jobsHigh?: number;
    revenueLow?: number;
    revenueHigh?: number;
  };
};

type Props = {
  campaignId: string;
  isCommercial?: boolean;
  isWebsiteIntelligence?: boolean;
  status: CampaignStatus;
  campaignName: string;
  estimatedBookedJobs: number | null;
  estimatedRevenue: number;
  actionBudget: number;
  briefJson?: unknown;
};

function parseBriefJson(value: unknown): ParsedBrief | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as ParsedBrief;
}

function getCurrentStageLabel(status: CampaignStatus) {
  switch (status) {
    case "DRAFT":
    case "READY":
      return "Draft";
    case "APPROVED":
      return "Approved";
    case "SCHEDULED":
      return "Queued";
    case "LAUNCHED":
      return "Launched";
    case "COMPLETED":
      return "Completed";
    default:
      return status;
  }
}

export function CampaignStatusActions({
  campaignId,
  isCommercial = false,
  isWebsiteIntelligence = false,
  status,
  campaignName,
  estimatedBookedJobs,
  estimatedRevenue,
  actionBudget,
  briefJson,
}: Props) {
  const router = useRouter();
  const [
    showRefreshingOverlay,
    setShowRefreshingOverlay,
  ] =
    useState(false);

  const [
    approvalBlock,
    setApprovalBlock,
  ] =
    useState<
      Extract<
        ApproveCampaignResult,
        {
          success: false;
        }
      > | null
    >(null);

  const [
    isPending,
    startTransition,
  ] =
    useTransition();

  const brief = parseBriefJson(briefJson);

  const visibleActionTitle =
    brief?.actionThesis?.title ??
    brief?.displayMoveLabel ??
    brief?.nextBestAction?.title ??
    campaignName;

  const jobsLow = brief?.estimatedRange?.jobsLow;
  const jobsHigh = brief?.estimatedRange?.jobsHigh;
  const revenueHigh = brief?.estimatedRange?.revenueHigh;

  const jobsLabel =
    jobsLow != null && jobsHigh != null
      ? `${jobsLow}–${jobsHigh} jobs`
      : `${estimatedBookedJobs ?? 0} jobs`;

  const revenueLabel = `$${Number(
    revenueHigh != null
      ? revenueHigh
      : estimatedRevenue
  ).toLocaleString()} revenue`;

  const commercialExpectedOutcome =
    brief?.commercialActionSpec
      ?.expectedOutcome ??
    "Advance this account toward a qualified Commercial relationship.";

  const websiteIntelligenceOutcome =
  brief?.websiteIntelligence
    ?.whyItMatters ??
  "Strengthen the website based on an observed Website Intelligence gap.";

  const websiteIntelligenceNextStep =
    brief?.websiteIntelligence
      ?.recommendedImprovement ??
    "Review the generated website content and supporting guidance.";

  const commercialNextStep =
    brief?.commercialActionSpec
      ?.primaryCallToAction ??
    "Begin the Commercial pursuit.";

  const canApprove = status === "DRAFT" || status === "READY";
  const canQueue = status === "APPROVED";
  const canLaunch = status === "SCHEDULED";
  const canComplete = status === "LAUNCHED";
  const canSendBackToReview =
    status === "APPROVED" || status === "SCHEDULED";

  return (
    <>
      <section className="mf-card rounded-3xl p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600">
              Decision
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
                {visibleActionTitle}
              </h2>

              <span className="rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">
                {getCurrentStageLabel(status)}
              </span>
            </div>

            {isCommercial ? (
              <div className="mt-3 grid max-w-4xl gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Expected Commercial Outcome
                  </p>

                  <p className="mt-1 text-sm font-semibold leading-6 text-gray-900">
                    {commercialExpectedOutcome}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Primary Next Step
                  </p>

                  <p className="mt-1 text-sm font-semibold leading-6 text-gray-900">
                    {commercialNextStep}
                  </p>
                </div>
              </div>
            ) : isWebsiteIntelligence ? (
              <div className="mt-3 grid max-w-4xl gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Website Improvement
                  </p>

                  <p className="mt-1 text-sm font-semibold leading-6 text-gray-900">
                    {websiteIntelligenceOutcome}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    What MarketForge Is Preparing
                  </p>

                  <p className="mt-1 text-sm font-semibold leading-6 text-gray-900">
                    {websiteIntelligenceNextStep}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap gap-3">
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Expected Outcome
                  </p>

                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {jobsLabel} · {revenueLabel}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Action Budget
                  </p>

                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    ${actionBudget.toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            <p className="mt-3 text-sm leading-6 text-gray-600">
              {isCommercial
                ? "Nothing moves into execution until you approve it. Review the pursuit materials below, then approve the action when the package is ready."
                : isWebsiteIntelligence
                  ? "Review the website content and publishing guidance below. Nothing is treated as implemented until you approve it and the work is actually published to the live website."
                  : "Nothing goes live until you approve. Review the assets below, then approve this action when it looks right."}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {canApprove && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setApprovalBlock(
                    null
                  );

                  setShowRefreshingOverlay(
                    true
                  );

                  startTransition(
                    async () => {
                      try {
                        const result =
                          await approveCampaign(
                            campaignId
                          );

                        if (
                          !result.success
                        ) {
                          setApprovalBlock(
                            result
                          );

                          setShowRefreshingOverlay(
                            false
                          );

                          return;
                        }

                        router.push(
                          "/dashboard"
                        );

                        router.refresh();
                      } catch (error) {
                        console.error(
                          error
                        );

                        setShowRefreshingOverlay(
                          false
                        );
                      }
                    }
                  );
                }}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {isPending ? "Approving..." : "Approve Action"}
              </button>
            )}

            {canQueue && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setShowRefreshingOverlay(true);

                  startTransition(async () => {
                    try {
                      await queueCampaignForLaunch(campaignId);
                      router.refresh();
                    } catch (error) {
                      console.error(error);
                    } finally {
                      setShowRefreshingOverlay(false);
                    }
                  });
                }}
                className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
              >
                {isPending ? "Queueing..." : "Move to Queue"}
              </button>
            )}

            {canLaunch && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setShowRefreshingOverlay(true);

                  startTransition(async () => {
                    try {
                      await markCampaignLaunched(campaignId);
                      router.refresh();
                    } catch (error) {
                      console.error(error);
                    } finally {
                      setShowRefreshingOverlay(false);
                    }
                  });
                }}
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {isPending ? "Launching..." : "Mark as Launched"}
              </button>
            )}

            {canComplete && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setShowRefreshingOverlay(true);

                  startTransition(async () => {
                    try {
                      await markCampaignCompleted(campaignId);
                      router.refresh();
                    } catch (error) {
                      console.error(error);
                    } finally {
                      setShowRefreshingOverlay(false);
                    }
                  });
                }}
                className="rounded-xl bg-gray-800 px-5 py-3 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
              >
                {isPending ? "Completing..." : "Mark as Completed"}
              </button>
            )}

            {canSendBackToReview && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setShowRefreshingOverlay(true);

                  startTransition(async () => {
                    try {
                      await resetCampaignToReview(campaignId);
                      router.refresh();
                    } catch (error) {
                      console.error(error);
                    } finally {
                      setShowRefreshingOverlay(false);
                    }
                  });
                }}
                className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                {isPending ? "Updating..." : "Send Back to Review"}
              </button>
            )}
          </div>
        </div>
      </section>

      {approvalBlock ? (
        <section className="rounded-3xl border border-amber-300 bg-amber-50 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-800">
            Approval Blocked
          </p>

          <h3 className="mt-2 text-xl font-bold tracking-tight text-amber-950">
            {approvalBlock.title}
          </h3>

          <p className="mt-2 text-sm leading-6 text-amber-900">
            {approvalBlock.message}
          </p>

          <div className="mt-5 space-y-3">
            {approvalBlock.blockers.map(
              (blocker) => (
                <div
                  key={blocker.assetId}
                  className="rounded-2xl border border-amber-200 bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
                        {blocker.category}
                      </p>

                      <p className="mt-1 text-base font-semibold text-gray-900">
                        {blocker.assetTitle}
                      </p>
                    </div>

                    <a
                      href={`#commercial-asset-${blocker.assetId}`}
                      className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
                    >
                      Review Material
                    </a>
                  </div>

                  <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-700">
                    {blocker.blockerTypes.includes(
                      "NOT_APPROVED"
                    ) ? (
                      <li className="flex gap-2">
                        <span aria-hidden="true">
                          •
                        </span>

                        <span>
                          Approve this material after reviewing it.
                        </span>
                      </li>
                    ) : null}

                    {blocker.outstandingItems.map(
                      (item) => (
                        <li
                          key={item}
                          className="flex gap-2"
                        >
                          <span aria-hidden="true">
                            •
                          </span>

                          <span>
                            Replace the owner-input placeholder for{" "}
                            <span className="font-semibold">
                              {item}
                            </span>
                            .
                          </span>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )
            )}
          </div>

          <p className="mt-4 text-sm leading-6 text-amber-900">
            Use each material’s{" "}
            <span className="font-semibold">
              Edit
            </span>{" "}
            control to complete the listed items, save the changes, approve the
            material, and then approve the action again.
          </p>
        </section>
      ) : null}

      <SystemStatusOverlay

        mode="refreshing"
        visible={showRefreshingOverlay}
      />
    </>
  );
}