import { AttributionEntry, Campaign, CampaignAsset } from "@/generated/prisma";
import { CampaignCard } from "./campaign-card";
import { CampaignAssets } from "./campaign-assets";
import { CampaignPerformance } from "./campaign-performance";

type CampaignWithRelations = Campaign & {
  assets: CampaignAsset[];
  attributions: AttributionEntry[];
};

type Props = {
  campaigns: CampaignWithRelations[];
  businessLogoUrl?: string | null;
  businessName?: string | null;
};

export function CampaignsGrid({
  campaigns,
  businessLogoUrl,
  businessName,
}: Props) {
  return (
    <div className="space-y-6">
      {campaigns.map((campaign) => (
        <div key={campaign.id} className="space-y-4">
          <CampaignCard campaign={campaign} />
          <CampaignAssets
            assets={campaign.assets}
            logoUrl={businessLogoUrl}
            businessName={businessName}
          />
          <CampaignPerformance attribution={campaign.attributions} />
        </div>
      ))}
    </div>
  );
}