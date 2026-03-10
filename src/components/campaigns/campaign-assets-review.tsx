import { CampaignAsset } from "@prisma/client";

type Props = {
  assets: CampaignAsset[];
};

export function CampaignAssetsReview({ assets }: Props) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        Review Generated Assets
      </p>

      <div className="mt-4 space-y-4">
        {assets.map((asset) => (
          <div
            key={asset.id}
            className="rounded-xl border border-gray-200 bg-gray-50 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  {asset.assetType.replaceAll("_", " ")}
                </p>
                {asset.title ? (
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {asset.title}
                  </p>
                ) : null}
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  asset.isApproved
                    ? "bg-green-50 text-green-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {asset.isApproved ? "Approved" : "Needs Review"}
              </span>
            </div>

            <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-800">
              {asset.content}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}