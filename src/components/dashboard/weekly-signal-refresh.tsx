"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { runDashboardWeeklySignalRefresh } from "@/app/dashboard/actions";

type RefreshStatus =
  | "idle"
  | "checking"
  | "skipped"
  | "current"
  | "refresh_available"
  | "error";

export function WeeklySignalRefresh() {
  const router = useRouter();
  const hasRunRef = useRef(false);
  const [status, setStatus] = useState<RefreshStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (hasRunRef.current) {
      return;
    }

    hasRunRef.current = true;

    void runDashboardWeeklySignalRefresh()
      .then((response) => {
  if (!response?.success) {
    console.log("[dashboard] weekly signal refresh skipped", response);
    setStatus("skipped");
    return;
  }

  if (!response.result) {
    console.log("[dashboard] weekly signal refresh missing result", response);
    setStatus("error");
    return;
  }

  const result = response.result;

  console.log("[dashboard] weekly signal refresh completed", result);

  if (result.snapshotInvalidated) {
          setStatus("refresh_available");
          setMessage(
            "Market signals changed. Refresh recommendations when you are ready."
          );
          return;
        }

        setStatus("current");
      })
      .catch((error) => {
        console.error("[dashboard] weekly signal refresh failed", error);
        setStatus("error");
        setMessage(
          "MarketForge could not check updated market signals right now."
        );
      });
  }, []);

  if (status !== "refresh_available" && status !== "error") {
    return null;
  }

  return (
    <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">
            {status === "refresh_available"
              ? "Updated market signals are available"
              : "Market signal check failed"}
          </p>
          {message ? <p className="mt-1 text-blue-800">{message}</p> : null}
        </div>

        {status === "refresh_available" ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              startTransition(() => {
                router.refresh();
              });
            }}
            className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Updating..." : "Refresh Recommendations"}
          </button>
        ) : null}
      </div>
    </div>
  );
}