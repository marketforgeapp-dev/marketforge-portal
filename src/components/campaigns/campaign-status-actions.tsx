"use client";

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

type Props = {
  campaignId: string;
  status: CampaignStatus;
};

function getCurrentStageLabel(status: CampaignStatus) {
  switch (status) {
    case "DRAFT":
    case "READY":
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
      return status;
  }
}

export function CampaignStatusActions({ campaignId, status }: Props) {
    const router = useRouter();
  const [showRefreshingOverlay, setShowRefreshingOverlay] = useState(false);
  const [isPending, startTransition] = useTransition();

  const canApprove = status === "DRAFT" || status === "READY";
  const canQueue = status === "APPROVED";
  const canLaunch = status === "SCHEDULED";
  const canComplete = status === "LAUNCHED";
  const canSendBackToReview =
    status === "APPROVED" || status === "SCHEDULED";

  return (
        <>
      <section className="mf-card rounded-3xl p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
              Action Workflow
            </p>

            <p className="mt-2 text-lg font-semibold text-gray-900">
              Current stage: {getCurrentStageLabel(status)}
            </p>

            <p className="mt-1 text-sm leading-6 text-gray-600">
              Review the action, approve it, move it into queue, and track it
              through launch.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
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
      </section>

      <SystemStatusOverlay
        mode="refreshing"
        visible={showRefreshingOverlay}
      />
    </>
  );
}