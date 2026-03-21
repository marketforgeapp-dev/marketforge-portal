import { Campaign, CampaignAsset, Prisma } from "@/generated/prisma";
import { ExecutionColumn } from "./execution-column";

type CampaignWithExecution = Campaign & {
  briefJson: Prisma.JsonValue | null;
  campaignAssets: Pick<CampaignAsset, "id" | "assetType" | "isApproved">[];
};

type Props = {
  campaigns: CampaignWithExecution[];
};

export function ExecutionBoard({ campaigns }: Props) {
  const approved = campaigns.filter((campaign) => campaign.status === "APPROVED");
  const queued = campaigns.filter((campaign) => campaign.status === "SCHEDULED");
  const launched = campaigns.filter((campaign) => campaign.status === "LAUNCHED");
  const completed = campaigns.filter((campaign) => campaign.status === "COMPLETED");

  return (
    <section className="grid gap-4 xl:grid-cols-4">
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