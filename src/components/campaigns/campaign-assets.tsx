import { CampaignAsset } from "@prisma/client";

type Props = {
  assets: CampaignAsset[];
};

export function CampaignAssets({ assets }: Props) {
  if (!assets.length) return null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        Generated Assets
      </p>

      <div className="mt-4 space-y-4">
        {assets.map((asset) => (
          <div
            key={asset.id}
            className="rounded-xl border border-gray-200 bg-gray-50 p-4"
          >
            <p className="text-xs font-semibold uppercase text-blue-600">
              {asset.assetType.replaceAll("_", " ")}
            </p>

            {asset.title && (
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {asset.title}
              </p>
            )}

            <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
              {asset.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}