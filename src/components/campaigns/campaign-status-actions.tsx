"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SystemStatusOverlay } from "@/components/system/system-status-overlay";
import {
  approveCampaign,
  queueCampaignForLaunch,
  resetCampaignToReview,
} from "@/app/campaigns/[campaignId]/actions";
import {
  markCampaignLaunched,
  markCampaignCompleted,
} from "@/app/execution/actions";
import { CampaignStatus } from "@/generated/prisma";

type ParsedBrief = {
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
  status,
  campaignName,
  estimatedBookedJobs,
  estimatedRevenue,
  actionBudget,
  briefJson,
}: Props) {
  const router = useRouter();
  const [showRefreshingOverlay, setShowRefreshingOverlay] = useState(false);
  const [isPending, startTransition] = useTransition();

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
    revenueHigh != null ? revenueHigh : estimatedRevenue
  ).toLocaleString()} revenue`;

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

            <p className="mt-3 text-sm leading-6 text-gray-600">
              Nothing goes live until you approve. Review the assets below, then
              approve this action when it looks right.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
                        {canApprove && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setShowRefreshingOverlay(true);

                  startTransition(async () => {
                    try {
                      await approveCampaign(campaignId);
                      router.push("/dashboard");
                      router.refresh();
                    } catch (error) {
                      console.error(error);
                      setShowRefreshingOverlay(false);
                    }
                  });
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

      <SystemStatusOverlay
        mode="refreshing"
        visible={showRefreshingOverlay}
      />
    </>
  );
}