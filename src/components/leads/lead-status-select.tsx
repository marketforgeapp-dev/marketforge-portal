"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LeadStatus } from "@/generated/prisma";
import { updateLeadStatus } from "@/app/leads/actions";

type Props = {
  leadId: string;
  currentStatus: LeadStatus;
};

const OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "ESTIMATE_SCHEDULED", label: "Estimate Scheduled" },
  { value: "BOOKED", label: "Booked" },
  { value: "LOST", label: "Lost" },
];

export function LeadStatusSelect({ leadId, currentStatus }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={currentStatus}
      disabled={isPending}
      onChange={(e) => {
        const nextStatus = e.target.value as LeadStatus;

        startTransition(async () => {
          await updateLeadStatus(leadId, nextStatus);
          router.refresh();
        });
      }}
      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
    >
      {OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}