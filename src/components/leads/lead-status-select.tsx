"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LeadStatus } from "@/generated/prisma";
import { markLeadBooked, updateLeadStatus } from "@/app/leads/actions";

type Props = {
  leadId: string;
  currentStatus: LeadStatus;
  currentBookedRevenue?: number | null;
};

const OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "ESTIMATE_SCHEDULED", label: "Estimate Scheduled" },
  { value: "BOOKED", label: "Booked" },
  { value: "LOST", label: "Lost" },
];

export function LeadStatusSelect({
  leadId,
  currentStatus,
  currentBookedRevenue,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [selectedStatus, setSelectedStatus] = useState<LeadStatus>(currentStatus);
  const [bookedRevenue, setBookedRevenue] = useState<string>(
    currentBookedRevenue ? String(currentBookedRevenue) : ""
  );
  const [bookingNotes, setBookingNotes] = useState("");
  const [error, setError] = useState("");
  const [isEditingBookedRevenue, setIsEditingBookedRevenue] = useState(
    currentStatus === "BOOKED" && !currentBookedRevenue
  );

  const showBookedForm = useMemo(() => {
    if (selectedStatus !== "BOOKED") return false;
    if (currentStatus !== "BOOKED") return true;
    return isEditingBookedRevenue;
  }, [selectedStatus, currentStatus, isEditingBookedRevenue]);

  return (
    <div
      key={`${leadId}-${currentStatus}-${currentBookedRevenue ?? "none"}`}
      className="space-y-2"
    >
      <select
        value={selectedStatus}
        disabled={isPending}
        onChange={(e) => {
          const nextStatus = e.target.value as LeadStatus;
          setSelectedStatus(nextStatus);
          setError("");

          if (nextStatus === "BOOKED") {
            setIsEditingBookedRevenue(true);
            return;
          }

          setIsEditingBookedRevenue(false);

          startTransition(async () => {
            await updateLeadStatus(leadId, nextStatus);
            router.refresh();
          });
        }}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {currentStatus === "BOOKED" && currentBookedRevenue && !showBookedForm ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Booked Revenue Recorded
          </p>

          <p className="mt-2 text-sm font-semibold text-gray-900">
            ${Number(currentBookedRevenue).toLocaleString()}
          </p>

          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              setSelectedStatus("BOOKED");
              setIsEditingBookedRevenue(true);
              setError("");
            }}
            className="mt-3 inline-flex rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
          >
            Edit
          </button>
        </div>
      ) : null}

      {showBookedForm ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Booked Job Details
          </p>

          <div className="mt-3 space-y-2">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={bookedRevenue}
              onChange={(e) => setBookedRevenue(e.target.value)}
              placeholder="Actual revenue"
              className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />

            <textarea
              value={bookingNotes}
              onChange={(e) => setBookingNotes(e.target.value)}
              placeholder="Optional notes"
              rows={2}
              className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />

            {error ? (
              <p className="text-xs font-medium text-red-600">{error}</p>
            ) : null}

            <div className="flex gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  const revenueValue = Number(bookedRevenue);

                  if (!Number.isFinite(revenueValue) || revenueValue <= 0) {
                    setError("Enter actual booked revenue greater than 0.");
                    return;
                  }

                  setError("");

                  startTransition(async () => {
                    await markLeadBooked({
                      leadId,
                      bookedRevenue: revenueValue,
                      notes: bookingNotes.trim() || undefined,
                    });
                    setIsEditingBookedRevenue(false);
                    router.refresh();
                  });
                }}
                className="inline-flex rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {isPending ? "Saving..." : "Save Booked Revenue"}
              </button>

              {currentStatus === "BOOKED" && currentBookedRevenue ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    setIsEditingBookedRevenue(false);
                    setBookedRevenue(String(currentBookedRevenue));
                    setBookingNotes("");
                    setError("");
                  }}
                  className="inline-flex rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}