import type {
  WebsiteIntelligenceAssessment,
  WebsiteIntelligenceStatus,
} from "@/lib/website-intelligence";

type Props = {
  assessment: WebsiteIntelligenceAssessment;
};

const DIMENSIONS = [
  {
    key: "businessUnderstanding",
    label: "Business Understanding",
  },
  {
    key: "serviceAuthority",
    label: "Service Authority",
  },
  {
    key: "knowledgeDepth",
    label: "Knowledge Depth",
  },
  {
    key: "structuredClarity",
    label: "Structured Clarity",
  },
  {
    key: "localRelevance",
    label: "Local Relevance",
  },
  {
    key: "trustCredibility",
    label: "Trust & Credibility",
  },
  {
    key: "consistency",
    label: "Consistency",
  },
] as const;

function formatStatus(status: WebsiteIntelligenceStatus): string {
  if (status === "INSUFFICIENT_EVIDENCE") {
    return "Not Enough Evidence";
  }

  return status.charAt(0) + status.slice(1).toLowerCase();
}

function getStatusClasses(status: WebsiteIntelligenceStatus): string {
  if (status === "STRONG") {
    return "bg-green-50 text-green-700";
  }

  if (status === "PARTIAL") {
    return "bg-blue-50 text-blue-700";
  }

  if (status === "WEAK") {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-gray-100 text-gray-600";
}

export function AeoSignalList({ assessment }: Props) {
  const strongCount = DIMENSIONS.filter(
    (dimension) =>
      assessment.dimensions[dimension.key].status === "STRONG"
  ).length;

  return (
    <div className="mf-card rounded-3xl p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
            Website Signals
          </p>

          <p className="mt-1 text-sm text-gray-600">
            The areas MarketForge evaluates when understanding your website.
          </p>
        </div>

        <span className="rounded-full bg-gray-100 px-3 py-1 text-[10px] font-semibold text-gray-700">
          {strongCount} strong
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {DIMENSIONS.map((dimension) => {
          const result = assessment.dimensions[dimension.key];

          return (
            <div
              key={dimension.key}
              className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-gray-900">
                  {dimension.label}
                </p>

                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-semibold ${getStatusClasses(
                    result.status
                  )}`}
                >
                  {formatStatus(result.status)}
                </span>
              </div>

              <p className="mt-2 text-sm leading-5 text-gray-600">
                {result.summary}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}