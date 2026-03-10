type CampaignBriefData = {
  userPrompt?: string;
  parsedIntent?: {
    serviceCategory?: string;
    intent?: string;
    urgency?: string;
    timeframe?: string;
    promotionType?: string;
  };
  opportunityCheck?: {
    matchedOpportunityTitle?: string | null;
    matchedRecommendationTitle?: string | null;
    confidenceScore?: number;
    sourceTags?: string[];
    whyNowBullets?: string[];
    whyThisMatters?: string;
    rationale?: string;
  };
  campaignDraft?: {
    description?: string;
    offer?: string;
    audience?: string;
    cta?: string;
  };
  creativeGuidance?: {
    recommendedImage?: string;
    avoidImagery?: string;
  };
};

type Props = {
  briefJson: CampaignBriefData | null;
};

export function CampaignBriefPanel({ briefJson }: Props) {
  const parsedIntent = briefJson?.parsedIntent;
  const opportunityCheck = briefJson?.opportunityCheck;
  const campaignDraft = briefJson?.campaignDraft;
  const creativeGuidance = briefJson?.creativeGuidance;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        AI Campaign Brief
      </p>

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase text-gray-500">
              User Prompt
            </p>
            <p className="mt-2 text-sm text-gray-900">
              {briefJson?.userPrompt ?? "No prompt stored"}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase text-gray-500">
              Parsed Intent
            </p>
            <div className="mt-2 space-y-1 text-sm text-gray-900">
              <p>Service: {parsedIntent?.serviceCategory ?? "—"}</p>
              <p>Intent: {parsedIntent?.intent ?? "—"}</p>
              <p>Urgency: {parsedIntent?.urgency ?? "—"}</p>
              <p>Timeframe: {parsedIntent?.timeframe ?? "—"}</p>
              <p>Promotion Type: {parsedIntent?.promotionType ?? "—"}</p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase text-gray-500">
              Opportunity Check
            </p>
            <div className="mt-2 space-y-2 text-sm text-gray-900">
              <p>
                Matched Opportunity:{" "}
                {opportunityCheck?.matchedOpportunityTitle ?? "No strong match"}
              </p>
              <p>
                Matched Recommendation:{" "}
                {opportunityCheck?.matchedRecommendationTitle ?? "No strong match"}
              </p>
              <p>Confidence: {opportunityCheck?.confidenceScore ?? "—"}%</p>
              <p>
                Sources:{" "}
                {Array.isArray(opportunityCheck?.sourceTags)
                  ? opportunityCheck.sourceTags.join(" • ")
                  : "—"}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase text-gray-500">
              Why This Exists
            </p>
            <ul className="mt-2 space-y-2 text-sm text-gray-900">
              {Array.isArray(opportunityCheck?.whyNowBullets) &&
              opportunityCheck.whyNowBullets.length > 0 ? (
                opportunityCheck.whyNowBullets.map((bullet) => (
                  <li key={bullet}>• {bullet}</li>
                ))
              ) : (
                <li>• No explanation stored</li>
              )}
            </ul>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase text-gray-500">
              Why This Matters
            </p>
            <p className="mt-2 text-sm leading-6 text-gray-900">
              {opportunityCheck?.whyThisMatters ??
                opportunityCheck?.rationale ??
                "—"}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase text-gray-500">
              Campaign Draft
            </p>
            <div className="mt-2 space-y-2 text-sm text-gray-900">
              <p>Description: {campaignDraft?.description ?? "—"}</p>
              <p>Offer: {campaignDraft?.offer ?? "—"}</p>
              <p>Audience: {campaignDraft?.audience ?? "—"}</p>
              <p>CTA: {campaignDraft?.cta ?? "—"}</p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase text-gray-500">
              Creative Guidance
            </p>
            <div className="mt-2 space-y-2 text-sm text-gray-900">
              <p>
                Recommended Image: {creativeGuidance?.recommendedImage ?? "—"}
              </p>
              <p>Avoid: {creativeGuidance?.avoidImagery ?? "—"}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}