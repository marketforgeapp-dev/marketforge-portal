"use client";

import { useTransition } from "react";

import { SystemStatusOverlay } from "@/components/system/system-status-overlay";

type Props = {
  action: () => Promise<void>;
  label: string;
  variant: "blue" | "amber";
  overlayTitle?: string;
  overlayDescription?: string;
};

export function WebsiteIntelligenceActionButton({
  action,
  label,
  variant,
  overlayTitle,
  overlayDescription,
}: Props) {
  const [isPending, startTransition] =
    useTransition();

  const buttonClasses =
    variant === "blue"
      ? "bg-blue-600 hover:bg-blue-700"
      : "bg-amber-500 hover:bg-amber-600";

  function handleClick() {
    startTransition(async () => {
      await action();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={`shrink-0 rounded-xl px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${buttonClasses}`}
      >
        {isPending
          ? "Working..."
          : label}
      </button>

      <SystemStatusOverlay
        mode="generating"
        visible={isPending}
        title={overlayTitle}
        description={overlayDescription}
      />
    </>
  );
}