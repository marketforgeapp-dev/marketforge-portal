import { Campaign, Prisma } from "@/generated/prisma";
import { ExecutionColumn } from "./execution-column";

type CampaignWithExecution = Campaign & {
  briefJson: Prisma.JsonValue | null;
};

type Props = {
  campaigns: CampaignWithExecution[];
};

export function ExecutionBoard({ campaigns }: Props) {
  const draftReady = campaigns.filter((c) => c.status === "READY");
  const approved = campaigns.filter((c) => c.status === "APPROVED");
  const queued = campaigns.filter((c) => c.status === "SCHEDULED");
  const launched = campaigns.filter((c) => c.status === "LAUNCHED");
  const completed = campaigns.filter((c) => c.status === "COMPLETED");

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <ExecutionColumn
        title="Draft Ready"
        description="AI-generated campaigns ready for customer review."
        campaigns={draftReady}
      />

      <ExecutionColumn
        title="Approved"
        description="Approved campaigns that can be moved into the launch queue."
        campaigns={approved}
      />

      <ExecutionColumn
        title="Queued for Launch"
        description="Campaigns waiting for MarketForge-managed execution."
        campaigns={queued}
      />

      <ExecutionColumn
        title="Launched"
        description="Campaigns currently live in market."
        campaigns={launched}
      />

      <ExecutionColumn
        title="Completed"
        description="Campaigns that have finished their run."
        campaigns={completed}
      />
    </div>
  );
}