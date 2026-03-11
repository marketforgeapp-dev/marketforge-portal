import { CampaignAsset } from "@/generated/prisma";

type Props = {
  assets: CampaignAsset[];
  logoUrl?: string | null;
  businessName?: string | null;
};

function getBusinessInitials(name?: string | null) {
  if (!name) return "B";

  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();

  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
}

export function CampaignAssets({
  assets,
  logoUrl,
  businessName,
}: Props) {
  if (assets.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-gray-900">No assets yet</p>
        <p className="mt-2 text-sm text-gray-600">
          Campaign assets will appear here after generation.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {assets.map((asset) => (
        <div
          key={asset.id}
          className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-start gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={businessName ?? "Business logo"}
                className="h-10 w-10 rounded-lg border border-gray-200 bg-white p-1 object-contain"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-gray-100 text-xs font-semibold text-gray-500">
                {getBusinessInitials(businessName)}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                  {asset.assetType.replaceAll("_", " ")}
                </span>

                {asset.title ? (
                  <span className="text-sm font-semibold text-gray-900">
                    {asset.title}
                  </span>
                ) : null}
              </div>

              <div className="mt-3 whitespace-pre-wrap rounded-xl bg-gray-50 p-3 text-sm leading-6 text-gray-700">
                {asset.content}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}