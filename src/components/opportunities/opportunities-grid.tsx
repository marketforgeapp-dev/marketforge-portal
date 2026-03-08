import { RevenueOpportunity } from "@prisma/client";
import { OpportunityCard } from "./opportunity-card";

type OpportunitiesGridProps = {
  opportunities: RevenueOpportunity[];
};

export function OpportunitiesGrid({ opportunities }: OpportunitiesGridProps) {
  if (opportunities.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-lg font-semibold text-gray-900">No opportunities yet</p>
        <p className="mt-2 text-sm text-gray-600">
          Once demand signals and competitor insights are available, revenue opportunities will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {opportunities.map((opportunity) => (
        <OpportunityCard key={opportunity.id} opportunity={opportunity} />
      ))}
    </div>
  );
}