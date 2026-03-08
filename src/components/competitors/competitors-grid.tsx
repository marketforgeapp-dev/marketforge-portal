import { Competitor } from "@prisma/client";
import { CompetitorCard } from "./competitor-card";

type Props = {
  competitors: Competitor[];
};

export function CompetitorsGrid({ competitors }: Props) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {competitors.map((competitor) => (
        <CompetitorCard key={competitor.id} competitor={competitor} />
      ))}
    </div>
  );
}