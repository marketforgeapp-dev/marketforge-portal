"use client";

type Props = {
  mode: "generating" | "refreshing";
  visible: boolean;
};

export function SystemStatusOverlay({ mode, visible }: Props) {
  if (!visible) return null;

  const content =
    mode === "generating"
      ? {
          title: "Generating your action...",
          description:
            "Building campaign assets and previews. This usually takes a minute.",
        }
      : {
          title: "Refreshing your workspace...",
          description:
            "Updating recommendations, actions, and reports with your latest changes.",
        };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white px-6 py-6 text-center shadow-xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-600">
          MarketForge Processing
        </p>

        <h2 className="mt-3 text-lg font-bold text-gray-900">
          {content.title}
        </h2>

        <p className="mt-2 text-sm text-gray-600">
          {content.description}
        </p>

        <div className="mt-5 flex justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        </div>
      </div>
    </div>
  );
}