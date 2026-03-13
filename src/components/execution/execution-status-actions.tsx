"use client";

import { useState, useTransition } from "react";
import {
  markCampaignCompleted,
  markCampaignLaunched,
  queueCampaignWithExecutionDetails,
} from "@/app/execution/actions";
import { CampaignStatus } from "@/generated/prisma";

type Props = {
  campaignId: string;
  status: CampaignStatus;
};

export function ExecutionStatusActions({ campaignId, status }: Props) {
  const [isPending, startTransition] = useTransition();

  const [scheduledLaunchDate, setScheduledLaunchDate] = useState("");
  const [launchOwner, setLaunchOwner] = useState("MarketForge Team");
  const [launchPlatform, setLaunchPlatform] = useState("Google Business");
  const [credentialsReceived, setCredentialsReceived] = useState(false);
  const [launchNotes, setLaunchNotes] = useState("");

  const canQueue = status === "APPROVED";
  const canLaunch = status === "SCHEDULED";
  const canComplete = status === "LAUNCHED";

  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
        Execution Controls
      </p>

      {canQueue ? (
        <div className="grid gap-3">
          <input
            type="date"
            value={scheduledLaunchDate}
            onChange={(e) => setScheduledLaunchDate(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          />

          <input
            type="text"
            value={launchOwner}
            onChange={(e) => setLaunchOwner(e.target.value)}
            placeholder="Launch owner"
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          />

          <input
            type="text"
            value={launchPlatform}
            onChange={(e) => setLaunchPlatform(e.target.value)}
            placeholder="Launch platform"
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          />

          <textarea
            value={launchNotes}
            onChange={(e) => setLaunchNotes(e.target.value)}
            placeholder="Launch notes"
            rows={3}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          />

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={credentialsReceived}
              onChange={(e) => setCredentialsReceived(e.target.checked)}
            />
            Credentials / access received
          </label>

          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await queueCampaignWithExecutionDetails({
                  campaignId,
                  scheduledLaunchDate,
                  launchOwner,
                  launchPlatform,
                  credentialsReceived,
                  launchNotes,
                });
              })
            }
            className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
          >
            {isPending ? "Queueing..." : "Move to Queue"}
          </button>
        </div>
      ) : null}

      {canLaunch ? (
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await markCampaignLaunched(campaignId);
            })
          }
          className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {isPending ? "Updating..." : "Mark as Launched"}
        </button>
      ) : null}

      {canComplete ? (
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await markCampaignCompleted(campaignId);
            })
          }
          className="w-full rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
        >
          {isPending ? "Updating..." : "Mark as Completed"}
        </button>
      ) : null}

      {!canQueue && !canLaunch && !canComplete ? (
        <p className="text-sm leading-5 text-gray-600">
          This action is not yet ready for the next execution step.
        </p>
      ) : null}
    </div>
  );
}