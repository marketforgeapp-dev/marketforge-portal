"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CampaignAsset, CampaignStatus } from "@/generated/prisma";
import { saveCampaignAssetEdit } from "@/app/campaigns/[campaignId]/actions";

type Props = {
  campaignId: string;
  status: CampaignStatus;
  assets: CampaignAsset[];
};

function formatAssetType(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function CampaignAssetsReview({ campaignId, status, assets }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");

  const canEdit = status !== "LAUNCHED" && status !== "COMPLETED";

  return (
    <section className="mf-card rounded-3xl p-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
          Action Assets
        </p>

        {canEdit ? (
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            Editable Before Launch
          </span>
        ) : (
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
            Locked After Launch
          </span>
        )}
      </div>

      <div className="mt-4 space-y-4">
        {assets.map((asset) => {
          const isEditing = editingAssetId === asset.id;

          return (
            <div
              key={asset.id}
              className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-600">
                    {formatAssetType(asset.assetType)}
                  </p>

                  {isEditing ? (
                    <input
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  ) : asset.title ? (
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {asset.title}
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      asset.isApproved
                        ? "bg-green-50 text-green-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {asset.isApproved ? "Approved" : "Needs Review"}
                  </span>

                  {canEdit && !isEditing ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAssetId(asset.id);
                        setDraftTitle(asset.title ?? "");
                        setDraftContent(asset.content);
                      }}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Edit
                    </button>
                  ) : null}
                </div>
              </div>

              {isEditing ? (
                <div className="mt-3 space-y-3">
                  <textarea
                    value={draftContent}
                    onChange={(e) => setDraftContent(e.target.value)}
                    rows={10}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm leading-6 text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          await saveCampaignAssetEdit({
                            campaignId,
                            assetId: asset.id,
                            title: draftTitle,
                            content: draftContent,
                          });
                          setEditingAssetId(null);
                          router.refresh();
                        })
                      }
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      {isPending ? "Saving..." : "Save Asset"}
                    </button>

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        setEditingAssetId(null);
                        setDraftTitle("");
                        setDraftContent("");
                      }}
                      className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-800">
                  {asset.content}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}