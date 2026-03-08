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
    },
    {
      label: "FAQ Content",
      value: hasFaqContent ? "Present" : "Missing",
      good: hasFaqContent,
    },
    {
      label: "Blog / Content Layer",
      value: hasBlog ? "Present" : "Missing",
      good: hasBlog,
    },
    {
      label: "Google Business Profile",
      value: hasGoogleBusinessPage ? "Connected" : "Missing",
      good: hasGoogleBusinessPage,
    },
    {
      label: "Service Page Count",
      value: `${servicePageCount}`,
      good: servicePageCount >= 4,
    },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        Readiness Signals
      </p>

      <div className="mt-4 space-y-3">
        {signals.map((signal) => (
          <div
            key={signal.label}
            className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"
          >
            <p className="text-sm font-medium text-gray-900">{signal.label}</p>
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
        ))}
      </div>
    </div>
  );
}