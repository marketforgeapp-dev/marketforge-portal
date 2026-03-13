import { Campaign, Prisma } from "@/generated/prisma";
import { ExecutionCard } from "./execution-card";

type CampaignWithExecution = Campaign & {
  briefJson: Prisma.JsonValue | null;
};

type Props = {
  title: string;
  description: string;
  campaigns: CampaignWithExecution[];
};

export function ExecutionColumn({ title, description, campaigns }: Props) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <div className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/85">
          {title}
        </p>
        <p className="mt-1 text-sm leading-5 text-white/60">{description}</p>
      </div>

      <div className="space-y-4">
        {campaigns.length > 0 ? (
          campaigns.map((campaign) => (
            <ExecutionCard key={campaign.id} campaign={campaign} />
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-4 text-sm text-white/55">
            No actions in this stage.
          </div>
        )}
      </div>
    </section>
  );
}