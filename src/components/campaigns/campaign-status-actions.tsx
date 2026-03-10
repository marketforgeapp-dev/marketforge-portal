"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveCampaign, queueCampaignForLaunch } from "@/app/campaigns/[campaignId]/actions";
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

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        Campaign Workflow
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!canApprove || isPending}
          onClick={() =>
            startTransition(async () => {
              await approveCampaign(campaignId);
              router.refresh();
            })
          }
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending && canApprove ? "Approving..." : "Approve Campaign"}
        </button>

        <button
          type="button"
          disabled={!canQueue || isPending}
          onClick={() =>
            startTransition(async () => {
              await queueCampaignForLaunch(campaignId);
              router.refresh();
            })
          }
          className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending && canQueue ? "Queueing..." : "Queue for Launch"}
        </button>
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-700">
        <p>
          Default v1 execution model: customer reviews and approves the campaign,
          then MarketForge manages launch execution.
        </p>
      </div>
    </section>
  );
}