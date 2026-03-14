"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCampaignFromOpportunity } from "@/app/campaigns/actions";

type Props = {
  opportunityKey: string;
  linkedCampaignId?: string | null;
  className?: string;
};

export function ActionLaunchButton({
  opportunityKey,
  linkedCampaignId,
  className,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          if (linkedCampaignId) {
            router.push(`/campaigns/${linkedCampaignId}`);
            return;
          }

          const result = await createCampaignFromOpportunity(opportunityKey);

          if (result.success) {
            router.push(`/campaigns/${result.campaignId}`);
          }
        })
      }
      className={className}
    >
      {isPending
        ? "Opening..."
        : "Review Action"}
    </button>
  );
}