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
    <section className="rounded-2xl border border-gray-200 bg-gray-100 p-4">
      <div className="mb-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-gray-700">
          {title}
        </p>
        <p className="mt-1 text-sm text-gray-600">{description}</p>
      </div>

      <div className="space-y-4">
        {campaigns.length > 0 ? (
          campaigns.map((campaign) => (
            <ExecutionCard key={campaign.id} campaign={campaign} />
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-500">
            No campaigns in this stage.
          </div>
        )}
      </div>
    </section>
  );
}