import { Campaign, CampaignAsset, AttributionEntry } from "@prisma/client";
import { CampaignCard } from "./campaign-card";
import { CampaignAssets } from "./campaign-assets";
import { CampaignPerformance } from "./campaign-performance";

type CampaignWithRelations = Campaign & {
  assets: CampaignAsset[];
  attributions: AttributionEntry[];
};

type Props = {
  campaigns: CampaignWithRelations[];
};

export function CampaignsGrid({ campaigns }: Props) {
  return (
    <div className="space-y-6">
      {campaigns.map((campaign) => (
        <div key={campaign.id} className="space-y-4">
          <CampaignCard campaign={campaign} />
          <CampaignAssets assets={campaign.assets} />
          <CampaignPerformance attribution={campaign.attributions} />
        </div>
      ))}
    </div>
  );
}