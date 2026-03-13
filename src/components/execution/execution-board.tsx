import { Campaign, Prisma } from "@/generated/prisma";
import { ExecutionColumn } from "./execution-column";

type CampaignWithExecution = Campaign & {
  briefJson: Prisma.JsonValue | null;
};

type Props = {
  campaigns: CampaignWithExecution[];
};

export function ExecutionBoard({ campaigns }: Props) {
  const ready = campaigns.filter((campaign) => campaign.status === "READY");
  const approved = campaigns.filter((campaign) => campaign.status === "APPROVED");
  const queued = campaigns.filter((campaign) => campaign.status === "SCHEDULED");
  const launched = campaigns.filter((campaign) => campaign.status === "LAUNCHED");
  const completed = campaigns.filter((campaign) => campaign.status === "COMPLETED");

  return (
    <section className="grid gap-4 xl:grid-cols-5">
      <ExecutionColumn
        title="Draft Ready"
        description="Generated actions waiting for review and approval."
        campaigns={ready}
      />

      <ExecutionColumn
        title="Approved"
        description="Approved actions ready to move into queue."
        campaigns={approved}
      />

      <ExecutionColumn
        title="Queued"
        description="Actions prepared for managed launch."
        campaigns={queued}
      />

      <ExecutionColumn
        title="Launched"
        description="Actions currently live and being tracked."
        campaigns={launched}
      />

      <ExecutionColumn
        title="Completed"
        description="Finished actions retained for results and reporting."
        campaigns={completed}
      />
    </section>
  );
}