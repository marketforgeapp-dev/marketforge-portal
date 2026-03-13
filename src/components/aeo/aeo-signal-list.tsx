type Props = {
  hasServicePages: boolean;
  hasFaqContent: boolean;
  hasBlog: boolean;
  hasGoogleBusinessPage: boolean;
  servicePageCount: number;
};

export function AeoSignalList({
  hasServicePages,
  hasFaqContent,
  hasBlog,
  hasGoogleBusinessPage,
  servicePageCount,
}: Props) {
  const signals = [
    {
      label: "Service Pages",
      value: hasServicePages ? "Present" : "Missing",
      good: hasServicePages,
      detail: hasServicePages
        ? "Core services are represented on the site."
        : "Dedicated service pages are missing.",
    },
    {
      label: "FAQ Content",
      value: hasFaqContent ? "Present" : "Missing",
      good: hasFaqContent,
      detail: hasFaqContent
        ? "Answer-ready content is available."
        : "Structured FAQ content is missing.",
    },
    {
      label: "Blog / Content Layer",
      value: hasBlog ? "Present" : "Missing",
      good: hasBlog,
      detail: hasBlog
        ? "Educational content supports answer depth."
        : "Topical content coverage is limited.",
    },
    {
      label: "Google Business Profile",
      value: hasGoogleBusinessPage ? "Connected" : "Missing",
      good: hasGoogleBusinessPage,
      detail: hasGoogleBusinessPage
        ? "Local entity signal is present."
        : "Local profile footprint is incomplete.",
    },
    {
      label: "Service Page Count",
      value: `${servicePageCount}`,
      good: servicePageCount >= 4,
      detail:
        servicePageCount >= 4
          ? "Coverage is broad enough to support multiple intents."
          : "More service-page coverage would strengthen visibility.",
    },
  ];

  return (
    <div className="mf-card rounded-3xl p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
          Readiness Signals
        </p>

        <span className="rounded-full bg-gray-100 px-3 py-1 text-[10px] font-semibold text-gray-700">
          {signals.filter((signal) => signal.good).length}/{signals.length} strong
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {signals.map((signal) => (
          <div
            key={signal.label}
            className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-gray-900">
                {signal.label}
              </p>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  signal.good
                    ? "bg-green-50 text-green-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {signal.value}
              </span>
            </div>

            <p className="mt-2 text-sm leading-5 text-gray-600">
              {signal.detail}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}