"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCampaignFromOpportunity } from "@/app/campaigns/actions";

type Props = {
  opportunityKey: string;
  linkedCampaignId?: string | null;
  className?: string;
  onStart?: () => void;
  onError?: () => void;
};

export function ActionLaunchButton({
  opportunityKey,
  linkedCampaignId,
  className,
  onStart,
  onError,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        onStart?.();

        startTransition(async () => {
          try {
            if (linkedCampaignId) {
              router.push(`/campaigns/${linkedCampaignId}`);
              return;
            }

            const result = await createCampaignFromOpportunity(opportunityKey);

            if (result.success) {
              router.push(`/campaigns/${result.campaignId}`);
            } else {
              onError?.();
            }
          } catch (error) {
            console.error(error);
            onError?.();
          }
        });
      }}
      className={className}
    >
      {isPending ? "Opening..." : "Review Action"}
    </button>
  );
}