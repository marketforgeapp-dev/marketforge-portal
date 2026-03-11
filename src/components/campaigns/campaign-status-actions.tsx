"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
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

export function CampaignStatusActions({ campaignId, status }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const canApprove = status === "READY";
  const canQueue = status === "APPROVED";
  const canLaunch = status === "SCHEDULED";
  const canComplete = status === "LAUNCHED";
  const canSendBackToReview =
    status === "APPROVED" || status === "SCHEDULED";

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        Campaign Workflow
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        {canApprove && (
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await approveCampaign(campaignId);
                router.refresh();
              })
            }
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {isPending ? "Approving..." : "Approve Campaign"}
          </button>
        )}

        {canQueue && (
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await queueCampaignForLaunch(campaignId);
                router.refresh();
              })
            }
            className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-600"
          >
            {isPending ? "Queueing..." : "Queue for Launch"}
          </button>
        )}

        {canLaunch && (
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await markCampaignLaunched(campaignId);
                router.refresh();
              })
            }
            className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            {isPending ? "Launching..." : "Mark Campaign Launched"}
          </button>
        )}

        {canComplete && (
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await markCampaignCompleted(campaignId);
                router.refresh();
              })
            }
            className="rounded-xl bg-gray-800 px-5 py-3 text-sm font-semibold text-white hover:bg-black"
          >
            {isPending ? "Completing..." : "Mark Campaign Completed"}
          </button>
        )}

        {canSendBackToReview && (
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await resetCampaignToReview(campaignId);
                router.refresh();
              })
            }
            className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            {isPending ? "Updating..." : "Send Back to Review"}
          </button>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-700">
        <p className="font-semibold text-gray-900">
          Managed execution workflow
        </p>

        <ul className="mt-2 list-disc pl-5 text-sm">
          <li>Draft Ready → review and edit campaign details</li>
          <li>Approved → queue for launch</li>
          <li>Queued → MarketForge launches campaign</li>
          <li>Launched → campaign runs and results are captured</li>
          <li>Completed → campaign closes and performance is tracked</li>
        </ul>
      </div>
    </section>
  );
}