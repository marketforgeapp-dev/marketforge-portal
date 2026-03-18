import { Competitor } from "@/generated/prisma";
import { CompetitorCard } from "./competitor-card";

type Props = {
  competitors: Competitor[];
};

export function CompetitorsGrid({ competitors }: Props) {
  if (competitors.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Competitor Set
        </p>
        <p className="mt-3 text-sm text-gray-700">
          No competitors are stored yet. Add or refine competitors in onboarding
          or Settings so MarketForge can compare local visibility and service
          coverage.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {competitors.map((competitor) => (
        <CompetitorCard key={competitor.id} competitor={competitor} />
      ))}
    </div>
  );
}