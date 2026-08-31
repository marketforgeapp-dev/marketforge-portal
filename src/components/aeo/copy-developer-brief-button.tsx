"use client";

import { useState } from "react";

type Props = {
  text: string;
};

export function CopyDeveloperBriefButton({ text }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);

    setCopied(true);

    window.setTimeout(() => {
      setCopied(false);
    }, 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-semibold text-amber-900 hover:bg-amber-50"
    >
      {copied ? "Copied" : "Copy Developer Brief"}
    </button>
  );
}