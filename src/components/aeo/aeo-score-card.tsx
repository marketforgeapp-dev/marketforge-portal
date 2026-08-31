import type { WebsiteIntelligenceAssessment } from "@/lib/website-intelligence";

type Props = {
  assessment: WebsiteIntelligenceAssessment;
};

export function AeoScoreCard({ assessment }: Props) {
  return (
    <div className="mf-card rounded-3xl p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600">
        Website Intelligence
      </p>

      <h2 className="mt-2 text-xl font-bold tracking-tight text-gray-900">
        What MarketForge sees
      </h2>

      <p className="mt-3 text-sm leading-6 text-gray-600">
        {assessment.overallSummary}
      </p>

      <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
          Website reviewed
        </p>

        <p className="mt-2 break-all text-sm font-medium text-gray-900">
          {assessment.website}
        </p>
      </div>

      <p className="mt-4 text-xs leading-5 text-gray-500">
        MarketForge bases this assessment on what is currently observable on
        your live website. Improvements are reflected only after they are
        published and observed in a future website review.
      </p>
    </div>
  );
}