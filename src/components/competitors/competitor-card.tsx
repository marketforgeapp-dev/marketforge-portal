import { Competitor } from "@/generated/prisma";

type Props = {
  competitor: Competitor;
};

function signalLabel(
  value: boolean | null | undefined,
  positive: string,
  negative: string
) {
  if (value == null) return "Unknown";
  return value ? positive : negative;
}

function normalizeWebsiteForDisplay(url: string | null | undefined): string {
  if (!url) {
    return "No website listed";
  }

  return url
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "");
}

function hasRenderableLogo(url: string | null | undefined): boolean {
  return typeof url === "string" && url.trim().length > 0;
}

export function CompetitorCard({ competitor }: Props) {
  return (
    <div className="mf-card rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {hasRenderableLogo(competitor.logoUrl) ? (
  // eslint-disable-next-line @next/next/no-img-element
  <img
    src={competitor.logoUrl!}
    alt={competitor.name}
    className="h-12 w-12 rounded-xl border border-gray-200 bg-white p-1 object-contain"
  />
) : (
  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-gray-100 text-sm font-semibold text-gray-500">
    {competitor.name.charAt(0)}
  </div>
)}

          <div>
            <p className="text-base font-semibold text-gray-900">
              {competitor.name}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              {normalizeWebsiteForDisplay(competitor.websiteUrl)}
            </p>
            {competitor.googleBusinessUrl ? (
              <p className="mt-1 text-xs text-blue-700">
                Google Business Profile linked
              </p>
            ) : null}
          </div>
        </div>

        {competitor.isPrimaryCompetitor ? (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            Primary
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-gray-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Service Focus
          </p>
          <p className="mt-1 text-sm text-gray-900">
            {competitor.serviceFocus.length > 0
              ? competitor.serviceFocus.join(" • ")
              : "Not listed"}
          </p>
        </div>

        <div className="rounded-xl bg-gray-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Reviews
          </p>
          <p className="mt-1 text-sm text-gray-900">
            {competitor.rating ? `${competitor.rating.toFixed(1)}★` : "—"} •{" "}
            {competitor.reviewCount ?? 0} reviews
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Ads
          </p>
          <p className="mt-1 text-sm font-medium text-gray-900">
            {signalLabel(competitor.isRunningAds, "Running Ads", "No Ad Signal")}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Posting
          </p>
          <p className="mt-1 text-sm font-medium text-gray-900">
            {signalLabel(
              competitor.isPostingActively,
              "Posting Actively",
              "Low Activity"
            )}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Promotions
          </p>
          <p className="mt-1 text-sm font-medium text-gray-900">
            {signalLabel(competitor.hasActivePromo, "Active Promo", "No Promo")}
          </p>
        </div>
      </div>

      {(competitor.signalSummary || competitor.notes) && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Why This Competitor Matters
          </p>
          <p className="mt-2 text-sm leading-6 text-gray-700">
            {competitor.signalSummary ?? competitor.notes}
          </p>
        </div>
      )}
    </div>
  );
}