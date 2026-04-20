import JSZip from "jszip";
import {
  BusinessProfile,
  Campaign,
  CampaignAsset,
  ExportType,
  Prisma,
} from "@/generated/prisma";
import {
  buildBudgetRecommendationMarkdown,
  getBudgetAllocationRecommendation,
} from "@/lib/budget-allocation-recommendations";

type CampaignAssetWithAiImage = CampaignAsset & {
  aiImageUrl?: string | null;
  aiImagePrompt?: string | null;
  aiImageStatus?: string | null;
  aiImageMimeType?: string | null;
};

type CampaignWithAssets = Campaign & {
  assets: CampaignAssetWithAiImage[];
};

type BuildExportPackParams = {
  campaign: CampaignWithAssets;
  profile: BusinessProfile | null;
};

type BriefJsonShape = {
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
  actionSpec?: {
    constructType?: string;
    secondaryConstructType?: string | null;
    businessGoal?: string;
    actionName?: string;
    targetService?: string;
    targetAudience?: string;
    audienceRationale?: string;
    audienceSourceType?: string;
    offerType?: string;
    offerLabel?: string | null;
    offerValue?: string | null;
    offerDuration?: string | null;
    offerConditions?: string | null;
    offerFulfillmentNotes?: string | null;
    coreMessageAngle?: string;
    cta?: string;
    proofOrDifferentiator?: string | null;
    messageGuardrails?: string[];
    whatHappensWhenLaunched?: string;
    executionMode?: string;
    automationEligibility?: string;
    executionMechanism?: {
      channelType?: string;
      triggerType?: string;
      deliverySurface?: string;
      operatorActionSummary?: string;
      requiredAssets?: string[];
      requiredAccess?: string[];
      manualSteps?: string[];
      futureAutomationHook?: string;
    };
    operationalDependencies?: {
      business_readiness?: string[];
      offer_readiness?: string[];
      asset_readiness?: string[];
      channel_access?: string[];
      tracking_readiness?: string[];
      staff_behavior?: string[];
      website_or_landing_readiness?: string[];
    };
    targeting?: {
      mode?: string;
      base?: {
        geography?: {
          type?: string;
          value?: string[];
        };
        service?: {
          primary?: string;
          demandType?: string;
        };
        businessType?: string;
        constraints?: string[];
      };
      intent?: {
        level?: string;
        purchaseUrgency?: number;
        conversionLikelihood?: number;
        rationale?: string;
      };
      economics?: {
        jobValueTier?: string;
        estimatedTicket?: number | null;
        rationale?: string;
      };
      wasteControls?: {
        excludeLowIntent?: boolean;
        excludeDIY?: boolean;
        excludeRenters?: boolean;
        negativeKeywordThemes?: string[];
        notes?: string[];
      };
      platforms?: {
        googleAds?: {
          locationTargets?: string[];
          keywordThemes?: string[];
          negativeKeywordThemes?: string[];
          audienceObservationHints?: string[];
          biddingFocus?: string;
          notes?: string[];
        };
        meta?: {
          locationTargets?: string[];
          ageRange?: [number, number] | null;
          homeownerFocus?: boolean;
          interestThemes?: string[];
          exclusions?: string[];
          notes?: string[];
        };
        googleBusinessProfile?: {
          locationTargets?: string[];
          localIntentFocus?: string;
          primaryServiceFocus?: string;
          postAngle?: string;
          visibilityGoal?: string;
          notes?: string[];
        };
      };
      summary?: {
        audienceDescription?: string;
        rationale?: string;
        notes?: string[];
      };
      execution?: {
        googleAds?: string[];
        meta?: string[];
        googleBusinessProfile?: string[];
      };
    };
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
  execution?: {
    scheduledLaunchDate?: string | null;
    launchOwner?: string | null;
    launchPlatform?: string | null;
    credentialsReceived?: boolean;
    launchNotes?: string | null;
    approvedAssetTypes?: string[];
  };
};

type GoogleBusinessAssetPayload = {
  kind: "GOOGLE_BUSINESS";
  title: string;
  description: string;
  cta: string;
  imageKey: string;
  imageMode: "SERVICE_IMAGE" | "LOGO";
  industry: string;
};

type MetaAssetPayload = {
  kind: "META";
  headline: string;
  primaryText: string;
  cta: string;
  imageKey: string;
  imageMode: "SERVICE_IMAGE" | "LOGO";
  industry: string;
};

type EmailAssetPayload = {
  kind: "EMAIL";
  subject: string;
  previewLine: string;
  body: string;
  cta: string;
  industry: string;
};

type BlogAssetPayload = {
  kind: "BLOG";
  title: string;
  excerpt: string;
  introduction: string;
  sections: Array<{
    heading: string;
    body: string;
  }>;
  cta: string;
  imageKey: string;
  imageMode: "SERVICE_IMAGE" | "LOGO";
  industry: string;
};

function safeBriefJson(value: Prisma.JsonValue | null): BriefJsonShape | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as BriefJsonShape;
}

function extractEstimatedRange(
  briefJson: Prisma.JsonValue | null
): {
  revenueLow?: number | null;
  revenueHigh?: number | null;
} | null {
  if (!briefJson || typeof briefJson !== "object" || Array.isArray(briefJson)) {
    return null;
  }

  const record = briefJson as Record<string, unknown>;
  const range = record.estimatedRange;

  if (!range || typeof range !== "object" || Array.isArray(range)) {
    return null;
  }

  const estimatedRange = range as Record<string, unknown>;

  return {
    revenueLow:
      typeof estimatedRange.revenueLow === "number"
        ? estimatedRange.revenueLow
        : null,
    revenueHigh:
      typeof estimatedRange.revenueHigh === "number"
        ? estimatedRange.revenueHigh
        : null,
  };
}

function approvedAssetByType(
  assets: CampaignAssetWithAiImage[],
  type: CampaignAsset["assetType"]
) {
  return (
    assets.find((asset) => asset.assetType === type && asset.isApproved) ?? null
  );
}

function parseStructuredAsset<T>(asset: CampaignAsset | null): T | null {
  if (!asset) return null;

  try {
    const parsed = JSON.parse(asset.content);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as T;
  } catch {
    return null;
  }
}

function svgTemplate(params: {
  width: number;
  height: number;
  title: string;
  subtitle: string;
  safeArea?: string;
}) {
  const { width, height, title, subtitle, safeArea } = params;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#151A21"/>
  <rect x="24" y="24" width="${width - 48}" height="${height - 48}" rx="24" fill="#1E2630" stroke="#2A3340" stroke-width="2"/>
  <rect x="60" y="60" width="${width - 120}" height="${height - 120}" rx="20" fill="none" stroke="#F5B942" stroke-width="3" stroke-dasharray="10 10"/>
  <text x="80" y="120" fill="#F5B942" font-size="32" font-family="Inter, Arial, sans-serif" font-weight="700">${title}</text>
  <text x="80" y="170" fill="#FFFFFF" font-size="24" font-family="Inter, Arial, sans-serif">${subtitle}</text>
  <text x="80" y="${height - 120}" fill="#9CA3AF" font-size="20" font-family="Inter, Arial, sans-serif">Replace this canvas with final creative.</text>
  <text x="80" y="${height - 85}" fill="#9CA3AF" font-size="18" font-family="Inter, Arial, sans-serif">${safeArea ?? ""}</text>
</svg>`;
}

function toCurrency(value: number | null | undefined) {
  return `$${Number(value ?? 0).toLocaleString()}`;
}

function formatLabel(value?: string | null) {
  if (!value) return "Not provided";

  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function flattenDependencyGroups(
  dependencies?: {
    business_readiness?: string[];
    offer_readiness?: string[];
    asset_readiness?: string[];
    channel_access?: string[];
    tracking_readiness?: string[];
    staff_behavior?: string[];
    website_or_landing_readiness?: string[];
  }
): string[] {
  if (!dependencies) return [];

  return [
    ...(dependencies.business_readiness ?? []),
    ...(dependencies.offer_readiness ?? []),
    ...(dependencies.asset_readiness ?? []),
    ...(dependencies.channel_access ?? []),
    ...(dependencies.tracking_readiness ?? []),
    ...(dependencies.staff_behavior ?? []),
    ...(dependencies.website_or_landing_readiness ?? []),
  ];
}

function bulletLines(items?: string[] | null, fallback = "Not provided") {
  if (!items || items.length === 0) {
    return `- ${fallback}`;
  }

  return items.map((item) => `- ${item}`).join("\n");
}

function numberedLines(items?: string[] | null, fallback = "No steps provided") {
  if (!items || items.length === 0) {
    return `1. ${fallback}`;
  }

  return items.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

function formatAgeRange(range?: [number, number] | null) {
  if (!range) return "Broad / not constrained";
  return `${range[0]}-${range[1]}`;
}

function sanitizeForFileName(value: string) {
  return value
    .replace(/[^a-zA-Z0-9-_ ]+/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function getImageExtensionFromMimeType(mimeType?: string | null) {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/png":
    default:
      return "png";
  }
}

async function fetchAiImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.error("[export-pack] failed to fetch AI image", {
        url,
        status: response.status,
      });
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("[export-pack] failed to download AI image", {
      url,
      error,
    });
    return null;
  }
}

async function addAiImageToFolder(params: {
  folder: JSZip | null;
  fileBaseName: string;
  asset: CampaignAssetWithAiImage | null;
}) {
  if (!params.folder || !params.asset?.aiImageUrl) {
    return false;
  }

  const buffer = await fetchAiImageBuffer(params.asset.aiImageUrl);
  if (!buffer) {
    return false;
  }

  const extension = getImageExtensionFromMimeType(params.asset.aiImageMimeType);
  params.folder.file(`${params.fileBaseName}.${extension}`, buffer);

  if (params.asset.aiImagePrompt) {
    params.folder.file(
      `${params.fileBaseName}-prompt.txt`,
      params.asset.aiImagePrompt
    );
  }

  return true;
}

function generateUtmSet(campaign: Campaign) {
  const baseCampaign = campaign.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_");

  return {
    facebook: {
      feed: `?utm_source=facebook&utm_medium=social&utm_campaign=${baseCampaign}&utm_content=feed&campaign_code=${campaign.campaignCode}`,
    },

    instagram: {
      feed: `?utm_source=instagram&utm_medium=social&utm_campaign=${baseCampaign}&utm_content=feed&campaign_code=${campaign.campaignCode}`,
      story: `?utm_source=instagram&utm_medium=social&utm_campaign=${baseCampaign}&utm_content=story&campaign_code=${campaign.campaignCode}`,
    },

    googleAds: {
      search: `?utm_source=google&utm_medium=cpc&utm_campaign=${baseCampaign}&utm_content=search&campaign_code=${campaign.campaignCode}`,
    },

    googleBusiness: {
      post: `?utm_source=google_business&utm_medium=organic&utm_campaign=${baseCampaign}&utm_content=post&campaign_code=${campaign.campaignCode}`,
    },

    yelp: {
      ad: `?utm_source=yelp&utm_medium=local&utm_campaign=${baseCampaign}&utm_content=ad&campaign_code=${campaign.campaignCode}`,
    },

    email: {
      click: `?utm_source=email&utm_medium=owned&utm_campaign=${baseCampaign}&utm_content=cta&campaign_code=${campaign.campaignCode}`,
    },
  };
}

function buildBlogArticleMarkdown(blog: BlogAssetPayload | null) {
  if (!blog) {
    return "No approved blog content found.";
  }

  const sections = blog.sections
    .map((section) => `## ${section.heading}\n\n${section.body}`)
    .join("\n\n");

  return `# ${blog.title}

${blog.excerpt}

${blog.introduction}

${sections}

## Next Step

${blog.cta}
`;
}

function buildTargetingSummaryMarkdown(
  actionSpec?: BriefJsonShape["actionSpec"] | null
) {
  const targeting = actionSpec?.targeting;
  if (!targeting) {
    return "No structured targeting guidance stored.";
  }

  return `## Targeting Summary
- Targeting Mode: ${formatLabel(targeting.mode)}
- Intent Level: ${formatLabel(targeting.intent?.level)}
- Demand Type: ${formatLabel(targeting.base?.service?.demandType)}
- Job Value Tier: ${formatLabel(targeting.economics?.jobValueTier)}
- Location: ${targeting.base?.geography?.value?.join(", ") ?? "Not provided"}

## Targeting Rationale
${targeting.summary?.rationale ?? "Not provided"}

## Waste Controls
${bulletLines(targeting.wasteControls?.notes)}

## Negative Keyword Themes
${bulletLines(targeting.wasteControls?.negativeKeywordThemes)}

## Google Ads Keyword Themes
${bulletLines(targeting.platforms?.googleAds?.keywordThemes)}

## Meta Targeting Notes
- Age Range: ${formatAgeRange(targeting.platforms?.meta?.ageRange)}
- Homeowner Focus: ${targeting.platforms?.meta?.homeownerFocus ? "Yes" : "No"}
- Interest Themes: ${
    targeting.platforms?.meta?.interestThemes?.join(", ") || "None recommended"
  }

## Google Business Profile Angle
- Local Intent Focus: ${
    targeting.platforms?.googleBusinessProfile?.localIntentFocus ?? "Not provided"
  }
- Post Angle: ${
    targeting.platforms?.googleBusinessProfile?.postAngle ?? "Not provided"
  }
- Visibility Goal: ${
    targeting.platforms?.googleBusinessProfile?.visibilityGoal ?? "Not provided"
  }
`;
}

function getPlatformBudgetLine(
  lines: Array<{ label: string; percentage: number; recommendedBudget: number }>,
  label: string
) {
  return lines.find((line) => line.label === label) ?? null;
}

function buildPlatformBudgetSection(params: {
  lines: Array<{ label: string; percentage: number; recommendedBudget: number }>;
  labels: string[];
}) {
  const matchedLines = params.labels
    .map((label) => getPlatformBudgetLine(params.lines, label))
    .filter(
      (
        line
      ): line is {
        label: string;
        percentage: number;
        recommendedBudget: number;
      } => Boolean(line)
    );

  if (matchedLines.length === 0) {
    return `## Budget for This Platform
No separate platform budget is recommended because this platform is not part of the approved allocation mix.
`;
  }

  const linesText = matchedLines
    .map(
      (line) =>
        `- ${line.label}: ${line.percentage}% (${toCurrency(
          line.recommendedBudget
        )})`
    )
    .join("\n");

  return `## Budget for This Platform
${linesText}
`;
}

function buildLaunchBasicsSection(params: {
  actionBudget: number;
  actionCta: string;
  serviceArea: string;
  targetService: string;
  businessName: string;
}) {
  return `## Before You Launch Anything
You must confirm these items before touching any platform.

- Business Name: ${params.businessName}
- Target Service: ${params.targetService}
- Service Area: ${params.serviceArea}
- Main CTA: ${params.actionCta}
- Total Action Budget: ${toCurrency(params.actionBudget)}

## Required Setup Checks
- Confirm you are inside the correct client account before making changes.
- Confirm the phone number, booking link, estimate form, or contact destination is correct.
- Confirm the service area is correct and matches the business reality.
- Confirm the offer is real and can be honored.
- Confirm the asset in this pack matches what was approved in MarketForge.
- Confirm you are only launching the platforms included in this pack.

## If You Do Not Have Tracking
- If call tracking or form tracking already exists, use it.
- If conversion tracking is not set up, you may still launch, but performance reporting will be limited.
- Do not guess at conversion settings. If unsure, leave tracking configuration unchanged and use the correct destination URL or phone CTA.
`;
}

function buildGlobalMistakesSection() {
  return `## Common Mistakes To Avoid
- Do not launch from the wrong business account.
- Do not target outside the real service area.
- Do not rewrite the approved copy unless the client requested a change.
- Do not swap in a different image if an approved AI image is included.
- Do not change the offer language.
- Do not point traffic to a broken or unrelated URL.
- Do not add extra keywords, audiences, or placements that are not in this pack.
- Do not panic if results are not immediate. Most platforms need time to review and start delivering.
`;
}

function buildAfterLaunchSection(params: {
  launchDestination: string;
  followUpNotes?: string[];
}) {
  return `## After Launch
- Verify the item is live in ${params.launchDestination}.
- Click the final link yourself and confirm it lands on the correct page.
- Confirm the CTA destination works on desktop and mobile.
- Save the live URL, screenshot, or platform confirmation if your workflow requires proof.
- Mark the campaign as Launched in MarketForge only after the item is actually live.
- Add launch notes in MarketForge if anything had to be adjusted.
${
  params.followUpNotes && params.followUpNotes.length > 0
    ? params.followUpNotes.map((note) => `- ${note}`).join("\n")
    : ""
}
`;
}

function buildGoogleAdsTargetingNotes(
  actionSpec?: BriefJsonShape["actionSpec"] | null
) {
  const googleAds = actionSpec?.targeting?.platforms?.googleAds;
  const execution = actionSpec?.targeting?.execution?.googleAds;

  if (!googleAds) {
    return "## Targeting Guidance\nNo Google Ads targeting guidance stored.\n";
  }

  return `## Targeting Guidance
- Location Targets: ${googleAds.locationTargets?.join(", ") ?? "Not provided"}
- Keyword Themes: ${googleAds.keywordThemes?.join(", ") ?? "Not provided"}
- Negative Keyword Themes: ${
    googleAds.negativeKeywordThemes?.join(", ") ?? "Not provided"
  }
- Bidding Focus: ${googleAds.biddingFocus ?? "Not provided"}

## Targeting Notes
${bulletLines(googleAds.notes)}

## Execution Instructions
${bulletLines(execution)}
`;
}

function buildMetaTargetingNotes(
  actionSpec?: BriefJsonShape["actionSpec"] | null
) {
  const meta = actionSpec?.targeting?.platforms?.meta;
  const execution = actionSpec?.targeting?.execution?.meta;

  if (!meta) {
    return "## Targeting Guidance\nNo Meta targeting guidance stored.\n";
  }

  return `## Targeting Guidance
- Location Targets: ${meta.locationTargets?.join(", ") ?? "Not provided"}
- Age Range: ${formatAgeRange(meta.ageRange)}
- Homeowner Focus: ${meta.homeownerFocus ? "Yes" : "No"}
- Interest Themes: ${meta.interestThemes?.join(", ") || "None recommended"}
- Exclusions: ${meta.exclusions?.join(", ") || "None recorded"}

## Targeting Notes
${bulletLines(meta.notes)}

## Execution Instructions
${bulletLines(execution)}
`;
}

function buildGoogleBusinessTargetingNotes(
  actionSpec?: BriefJsonShape["actionSpec"] | null
) {
  const gbp = actionSpec?.targeting?.platforms?.googleBusinessProfile;
  const execution = actionSpec?.targeting?.execution?.googleBusinessProfile;

  if (!gbp) {
    return "## Targeting Guidance\nNo Google Business Profile targeting guidance stored.\n";
  }

  return `## Targeting Guidance
- Location Targets: ${gbp.locationTargets?.join(", ") ?? "Not provided"}
- Local Intent Focus: ${gbp.localIntentFocus ?? "Not provided"}
- Primary Service Focus: ${gbp.primaryServiceFocus ?? "Not provided"}
- Post Angle: ${gbp.postAngle ?? "Not provided"}
- Visibility Goal: ${gbp.visibilityGoal ?? "Not provided"}

## Targeting Notes
${bulletLines(gbp.notes)}

## Execution Instructions
${bulletLines(execution)}
`;
}

function buildWordPressBasicsSection() {
  return `## If The Website Uses WordPress
- Log in to the WordPress admin area.
- For a blog post, go to Posts > Add New or Posts > All Posts and open the correct draft.
- For a service page, FAQ page, or SEO update, go to Pages > All Pages and open the correct page.
- Use the visual or block editor unless the site owner specifically uses a different builder.
- Paste the approved content into the correct block or section.
- Click Preview before Publish or Update.
- After publishing, open the live page in a new browser tab and confirm the change is visible.

## If The Website Uses Another CMS
- Use the equivalent content editor in that system.
- Do not change layout, theme settings, menus, or plugins unless the task explicitly requires it.
- Only edit the post or page described in this pack.
`;
}

function buildGoogleBusinessOperatorNotes(params: {
  campaignName: string;
  actionOffer: string;
  actionCta: string;
  actionAudience: string;
  actionTargetService: string;
  actionDependencies: string[];
  budgetLines: Array<{ label: string; percentage: number; recommendedBudget: number }>;
  actionSpec?: BriefJsonShape["actionSpec"] | null;
  utm: string;
  serviceArea: string;
  businessName: string;
}) {
  return `# Google Business Profile Operator Notes

Use this folder only if Google Business Profile is an approved platform for this action.

${buildPlatformBudgetSection({
  lines: params.budgetLines,
  labels: ["Google Business Profile"],
})}
${buildGoogleBusinessTargetingNotes(params.actionSpec)}

## What You Are Creating
A Google Business Profile post or update promoting:
- Business: ${params.businessName}
- Service: ${params.actionTargetService}
- Audience: ${params.actionAudience}
- Offer: ${params.actionOffer}
- CTA: ${params.actionCta}

## Exact Steps
1. Open the client's Google Business Profile in Google Search or Google Business Profile Manager.
2. Look for a button or menu option such as "Add update," "Add photo update," "Create post," or similar.
3. Choose the update type that best fits the approved content. If there is no obvious special type, use a standard update.
4. Open \`post-copy.txt\` in this folder.
5. Copy the title and description from \`post-copy.txt\`.
6. Paste the text into the Google Business post fields.
7. Upload the approved image file in this folder if one is included.
8. Choose the CTA button that most closely matches the approved CTA.
9. Add the final destination URL if a URL field is available.
10. If a phone CTA is more appropriate than a URL, confirm the displayed phone number is correct.
11. Preview the post on desktop and mobile if the interface allows it.
12. Publish the post.

## Do Not Change These Settings
- Do not change the business name.
- Do not change the primary category.
- Do not change the service area.
- Do not invent a different offer.
- Do not add extra claims that were not approved.

## Paste Map
- Main copy: \`post-copy.txt\`
- Approved image: use the file in this folder if present
- Destination URL: use the approved booking, estimate, or landing page URL
- UTM to append when using a URL: ${params.utm}

## Before Publishing
- Confirm you are in the correct client profile.
- Confirm the profile serves ${params.serviceArea}.
- Confirm the destination URL works.
- Confirm the phone number is correct.
- Confirm the approved image is readable on mobile.
${
  params.actionDependencies.length > 0
    ? bulletLines(params.actionDependencies)
    : "- Confirm the action is operationally ready."
}

## Common Mistakes To Avoid
- Posting from the wrong profile.
- Forgetting to add the CTA button.
- Using the wrong URL.
- Uploading the wrong image.
- Editing service area or profile settings instead of just creating the post.

${buildAfterLaunchSection({
  launchDestination: "Google Business Profile",
  followUpNotes: [
    "Search the business name in Google and confirm the update appears on the profile.",
  ],
})}
`;
}

function buildFacebookOperatorNotes(params: {
  actionOffer: string;
  actionCta: string;
  actionAudience: string;
  actionTargetService: string;
  budgetLines: Array<{ label: string; percentage: number; recommendedBudget: number }>;
  actionSpec?: BriefJsonShape["actionSpec"] | null;
  utm: string;
}) {
  return `# Facebook Operator Notes

Use this folder for a Facebook ad or boosted-post style execution. If you are using Ads Manager, follow the ad setup path below. If the client only uses page posting, use the same approved copy and creative but understand performance tracking may be weaker.

${buildPlatformBudgetSection({
  lines: params.budgetLines,
  labels: ["Facebook & Instagram"],
})}
${buildMetaTargetingNotes(params.actionSpec)}

## What You Are Creating
A Facebook campaign promoting:
- Service: ${params.actionTargetService}
- Audience: ${params.actionAudience}
- Offer: ${params.actionOffer}
- CTA: ${params.actionCta}

## Recommended Objective
- Use Leads if the destination is a form, estimate request, or lead workflow.
- Use Traffic only if the business specifically needs website clicks and no lead setup is available.
- If the platform forces a different label because of interface changes, choose the closest objective focused on leads or conversions, not awareness.

## Exact Steps In Meta Ads Manager
1. Open Meta Ads Manager.
2. Click Create.
3. Choose the Leads objective if available. If Leads is unavailable, choose the closest conversion-focused objective. Avoid Awareness for this pack unless the action explicitly says otherwise.
4. Name the campaign using the campaign name from \`01-campaign-brief/campaign-summary.md\`.
5. At the campaign level, do not turn on extra campaign options unless the client specifically requires them.
6. Move to the Ad Set level.
7. Set the conversion location or result goal based on the client setup:
   - Website if the CTA sends traffic to a landing page or form.
   - Instant Form only if the client already uses Meta lead forms and wants leads captured inside Meta.
   - Calls only if the client wants direct phone calls and the account supports it.
8. Set the location to the approved service area only.
9. Apply the targeting guidance from this pack. Do not narrow beyond what is listed unless the client specifically approves it.
10. Leave gender broad unless the pack explicitly says otherwise.
11. Keep placements at Advantage+ or automatic placements unless the client has a clear reason to restrict placements.
12. Go to the Ad level.
13. Open \`facebook-copy.txt\`.
14. Paste the primary text into the main ad text field.
15. Use the headline from \`facebook-copy.txt\` in the headline field.
16. Upload the approved image in this folder if one is included.
17. Set the CTA button that best matches ${params.actionCta}.
18. Add the final URL and append this UTM when appropriate: ${params.utm}
19. Preview the ad in Facebook Feed and mobile placements.
20. Publish.

## If You Are Posting Instead Of Running A Paid Ad
1. Open the correct Facebook Page.
2. Create a new post.
3. Paste the approved copy from \`facebook-copy.txt\`.
4. Upload the approved image.
5. Add the correct booking or estimate link if the workflow supports it.
6. Publish or schedule the post.

## Do Not Change These Settings
- Do not choose Awareness as the objective unless the action explicitly requires awareness.
- Do not target outside the service area.
- Do not layer many extra interests.
- Do not change the offer.
- Do not replace the image with a new unapproved creative.

## Paste Map
- Primary text: \`facebook-copy.txt\`
- Headline: \`facebook-copy.txt\`
- Image: approved image in this folder if present
- Destination URL: approved booking or landing page URL
- UTM to append when using a URL: ${params.utm}

## Before Publishing
- Confirm the correct Facebook Page and ad account are selected.
- Confirm the destination URL works.
- Confirm the CTA button matches the approved action.
- Confirm the image preview looks correct on mobile.
- Confirm the ad is not accidentally using the wrong website domain.

## Common Mistakes To Avoid
- Picking Traffic when Leads is available and appropriate.
- Editing targeting beyond the approved plan.
- Using the wrong page or wrong ad account.
- Forgetting to add the final URL.
- Launching with placeholder text.

${buildAfterLaunchSection({
  launchDestination: "Meta Ads Manager or Facebook Page",
  followUpNotes: [
    "Check for Meta review status. Ads may need time for approval.",
    "Do not make major edits immediately after launch unless there is a clear error.",
  ],
})}
`;
}

function buildInstagramOperatorNotes(params: {
  actionOffer: string;
  actionCta: string;
  actionAudience: string;
  actionTargetService: string;
  budgetLines: Array<{ label: string; percentage: number; recommendedBudget: number }>;
  actionSpec?: BriefJsonShape["actionSpec"] | null;
  utmFeed: string;
  utmStory: string;
}) {
  return `# Instagram Operator Notes

Use this folder for Instagram execution through Meta Ads Manager or Meta Business Suite.

${buildPlatformBudgetSection({
  lines: params.budgetLines,
  labels: ["Facebook & Instagram"],
})}
${buildMetaTargetingNotes(params.actionSpec)}

## What You Are Creating
An Instagram ad or published post promoting:
- Service: ${params.actionTargetService}
- Audience: ${params.actionAudience}
- Offer: ${params.actionOffer}
- CTA: ${params.actionCta}

## Recommended Placement Logic
- Feed: use for the square or vertical feed image.
- Story: use only if the creative is easy to read in a tall mobile format.
- If you are using paid ads through Meta Ads Manager, automatic placements are acceptable unless the client requires restriction.

## Exact Steps In Meta Ads Manager
1. Open Meta Ads Manager.
2. Create a campaign using the Leads objective when possible.
3. Set the service area and approved audience settings at the Ad Set level.
4. Keep placements automatic unless there is a clear reason to restrict.
5. At the Ad level, open \`instagram-caption.txt\`.
6. Paste the approved primary text.
7. Use the approved headline where the interface allows it.
8. Upload the approved image in this folder.
9. If using a feed placement, prefer the 1080x1080 or 1080x1350 asset.
10. If using story placement, prefer the 1080x1920 asset.
11. Add the final URL if the setup uses website traffic or website leads.
12. Append the correct UTM:
   - Feed: ${params.utmFeed}
   - Story: ${params.utmStory}
13. Preview the ad in Instagram Feed and Story formats.
14. Publish.

## Exact Steps In Meta Business Suite For Organic Posting
1. Open Meta Business Suite.
2. Choose Create Post.
3. Select the correct Instagram account.
4. Paste the copy from \`instagram-caption.txt\`.
5. Upload the approved image.
6. If a link field is available, add the final URL.
7. Preview the post.
8. Publish or schedule it.

## Do Not Change These Settings
- Do not use the wrong image ratio for the placement.
- Do not add hashtags unless the client specifically wants them.
- Do not write new copy.
- Do not target outside the approved service area.
- Do not add extra targeting layers beyond this pack.

## Paste Map
- Caption / primary text: \`instagram-caption.txt\`
- Image: use the approved image in this folder
- Final URL: approved booking or landing page URL
- UTM when using links:
  - Feed: ${params.utmFeed}
  - Story: ${params.utmStory}

## Before Publishing
- Confirm the correct Instagram account is selected.
- Confirm the image is not cropped badly.
- Confirm the copy reads cleanly on mobile.
- Confirm the CTA destination works.
- Confirm the offer language matches the approved action.

## Common Mistakes To Avoid
- Using a square image in Story without checking crop.
- Forgetting to preview the mobile version.
- Using the wrong account.
- Adding extra text overlays that were not approved.

${buildAfterLaunchSection({
  launchDestination: "Instagram through Meta tools",
  followUpNotes: [
    "Check the live feed or story placement after launch to confirm the image crops correctly.",
  ],
})}
`;
}

function buildGoogleAdsOperatorNotes(params: {
  actionCta: string;
  actionTargetService: string;
  actionAudience: string;
  budgetLines: Array<{ label: string; percentage: number; recommendedBudget: number }>;
  actionSpec?: BriefJsonShape["actionSpec"] | null;
  utm: string;
  serviceArea: string;
}) {
  return `# Google Ads Operator Notes

Use this folder to build a Google Search campaign for the approved action. This section is written for an operator with little or no Google Ads experience.

${buildPlatformBudgetSection({
  lines: params.budgetLines,
  labels: ["Google Ads"],
})}
${buildGoogleAdsTargetingNotes(params.actionSpec)}

## What You Are Creating
A Google Search campaign or ad group promoting:
- Service: ${params.actionTargetService}
- Audience: ${params.actionAudience}
- CTA: ${params.actionCta}
- Service Area: ${params.serviceArea}

## Recommended Campaign Type
- Use Search.
- Do not use Display for this pack.
- Do not enable extra display expansion if Google suggests it.

## Exact Steps In Google Ads
1. Open the correct Google Ads account.
2. Click New Campaign.
3. Choose Leads if available. If Leads is unavailable, choose Sales or the closest conversion-focused option.
4. Choose Search as the campaign type.
5. If Google offers extra suggestions that are not required for Search, skip them unless the client explicitly wants them.
6. Name the campaign using the campaign name from \`01-campaign-brief/campaign-summary.md\`.
7. Set location targeting to the approved service area only.
8. At any network settings step, keep Search Network on if needed for the build but do not add Display Network.
9. If bidding must be selected and there is no custom instruction from the client, use Maximize Conversions when available. If conversion tracking is not available, use the most conservative default available and do not guess at advanced bidding changes.
10. Add keyword themes from the targeting section in this pack. Use them as the starting keyword set. Do not add broad unrelated keywords.
11. Add the negative keyword themes from this pack.
12. Open \`search-assets.txt\`.
13. Paste the approved headlines and descriptions into the responsive search ad fields.
14. Add the final URL and append this UTM when appropriate: ${params.utm}
15. If the setup uses a call extension or call asset, confirm the phone number is correct before saving.
16. Review all settings one more time.
17. Publish.

## Ad Asset Paste Map
- Headlines: copy from \`search-assets.txt\`
- Descriptions: copy from \`search-assets.txt\`
- Final URL: approved booking, estimate, or service page URL
- UTM to append when using a URL: ${params.utm}

## Do Not Change These Settings
- Do not add Display Network.
- Do not target outside ${params.serviceArea}.
- Do not add many extra keywords.
- Do not use broad, generic research keywords.
- Do not replace the final URL with a homepage unless that is the approved destination.
- Do not remove negative keywords.

## Before Publishing
- Confirm the correct Google Ads account is selected.
- Confirm location targeting is restricted to the approved service area.
- Confirm the final URL works and lands on the correct page.
- Confirm the phone number is correct if calls are part of the CTA.
- Confirm the copy matches the approved offer and service.
- Confirm the negative keyword list is present.

## Common Mistakes To Avoid
- Accidentally using Display Network.
- Using the homepage when a service page or estimate page should be used.
- Forgetting negative keywords.
- Launching with the wrong location.
- Changing the offer or headline structure.

${buildAfterLaunchSection({
  launchDestination: "Google Ads",
  followUpNotes: [
    "Check that the campaign and ad are approved or under review.",
    "Do not make major changes during the first review window unless you find a clear mistake.",
  ],
})}
`;
}

function buildYelpOperatorNotes(params: {
  actionOffer: string;
  actionCta: string;
  actionTargetService: string;
  budgetLines: Array<{ label: string; percentage: number; recommendedBudget: number }>;
  utm: string;
  serviceArea: string;
}) {
  return `# Yelp Operator Notes

Use this folder for Yelp promoted content, ad setup, or business update workflows.

${buildPlatformBudgetSection({
  lines: params.budgetLines,
  labels: ["Yelp"],
})}
## What You Are Creating
A Yelp update or ad promoting:
- Service: ${params.actionTargetService}
- Offer: ${params.actionOffer}
- CTA: ${params.actionCta}
- Service Area: ${params.serviceArea}

## Exact Steps
1. Open the correct Yelp business account.
2. Go to the content or advertising area relevant to the approved action.
3. Open \`yelp-ad-copy.txt\`.
4. Paste the approved copy into the Yelp field.
5. Add the correct booking link or call CTA.
6. If Yelp allows an image for this execution path, use the approved image that best matches the action.
7. Preview the listing or ad.
8. Publish or save.

## Do Not Change These Settings
- Do not add claims that violate Yelp policy.
- Do not use a different phone number or link.
- Do not target a different service area.
- Do not write new promotional copy unless required by policy.

## Before Publishing
- Confirm the correct Yelp business account is selected.
- Confirm the offer is allowed by Yelp.
- Confirm the phone number or link is correct.
- Confirm the service language matches the approved action.
- Append this UTM when using a URL: ${params.utm}

${buildAfterLaunchSection({
  launchDestination: "Yelp",
})}
`;
}

function buildEmailOperatorNotes(params: {
  actionOffer: string;
  actionCta: string;
  actionAudience: string;
  actionTargetService: string;
  budgetLines: Array<{ label: string; percentage: number; recommendedBudget: number }>;
  utm: string;
}) {
  return `# Email Operator Notes

Use this folder to send the approved campaign email through the client's email platform.

${buildPlatformBudgetSection({
  lines: params.budgetLines,
  labels: ["Email"],
})}
## What You Are Creating
An email promoting:
- Service: ${params.actionTargetService}
- Audience: ${params.actionAudience}
- Offer: ${params.actionOffer}
- CTA: ${params.actionCta}

## Exact Steps
1. Open the client's email platform.
2. Create a new campaign, draft, or send.
3. Open \`email-copy.txt\`.
4. Copy the subject line into the platform subject field.
5. Copy the preview line if the platform supports it.
6. Copy the email body into the main content area.
7. Add the CTA link or button destination.
8. Append this UTM when using a URL: ${params.utm}
9. Send a test email to yourself first.
10. Review formatting on desktop and mobile.
11. Schedule or send the email.

## Do Not Change These Settings
- Do not change the sender address unless the client requests it.
- Do not send before testing.
- Do not leave placeholder text in the email.
- Do not send to the wrong list.

## Before Sending
- Confirm subject line is present.
- Confirm links work.
- Confirm reply-to and sender address are correct.
- Confirm the audience/list is correct.
- Confirm the email body has spacing and line breaks.

${buildAfterLaunchSection({
  launchDestination: "the email platform",
  followUpNotes: [
    "Open the test email on mobile before sending the final version.",
  ],
})}
`;
}

function buildBlogOperatorNotes(params: {
  actionCta: string;
  actionTargetService: string;
  serviceArea: string;
  budgetLines: Array<{ label: string; percentage: number; recommendedBudget: number }>;
}) {
  return `# Blog Operator Notes

Use this folder to publish the approved blog article on the client's website.

${buildPlatformBudgetSection({
  lines: params.budgetLines,
  labels: ["Website / SEO / AEO"],
})}
${buildWordPressBasicsSection()}

## What You Are Creating
A blog article supporting:
- Service: ${params.actionTargetService}
- Service Area: ${params.serviceArea}
- CTA: ${params.actionCta}

## Exact Steps
1. Open the website CMS.
2. Go to the blog or post editor.
3. Create a new blog post or open the correct draft.
4. Open \`blog-article.md\`.
5. Copy the title and place it in the post title field.
6. Copy the rest of the article into the body editor.
7. Format the headings as heading blocks, not bold paragraphs.
8. Add bullet lists where the markdown shows bullet points.
9. Add the approved image if one is part of the workflow.
10. Add the CTA link or button near the end of the article.
11. Preview the post on desktop and mobile.
12. Publish or schedule it.

## Do Not Change These Settings
- Do not rewrite the article unless there is a factual issue.
- Do not remove the CTA.
- Do not change the service or city references.
- Do not publish with broken formatting.

## Before Publishing
- Confirm the title is correct.
- Confirm headings are formatted correctly.
- Confirm the article includes the CTA.
- Confirm the service area references are accurate.
- Confirm links work.
- Confirm the live preview looks clean on mobile.

${buildAfterLaunchSection({
  launchDestination: "the blog / website",
  followUpNotes: [
    "Open the live article after publishing and confirm the text, image, and CTA all display correctly.",
  ],
})}
`;
}

function buildAeoOperatorNotes(params: {
  actionTargetService: string;
  serviceArea: string;
  budgetLines: Array<{ label: string; percentage: number; recommendedBudget: number }>;
}) {
  return `# AEO Operator Notes

Use this folder to publish FAQ and short-answer content that improves answer-engine and search visibility.

${buildPlatformBudgetSection({
  lines: params.budgetLines,
  labels: ["Website / SEO / AEO"],
})}
${buildWordPressBasicsSection()}

## What You Are Creating
Helpful answer content related to:
- Service: ${params.actionTargetService}
- Service Area: ${params.serviceArea}

## Exact Steps
1. Open the target page where FAQ or answer content should live.
2. Open \`faq-content.md\`.
3. Paste the FAQ content into the FAQ section of the page or article.
4. Open \`answer-snippet.txt\`.
5. Paste the short answer into the page section where a concise answer is appropriate.
6. Keep the formatting simple and easy to scan.
7. Preview the page.
8. Publish or update the page.

## Do Not Change These Settings
- Do not add unsupported claims.
- Do not paste the content into the wrong page.
- Do not hide the FAQ inside an unrelated section.
- Do not remove service area references if they are part of the approved answer.

## Before Publishing
- Confirm the answers are accurate for the business.
- Confirm the page still reads naturally.
- Confirm the content is visible to normal site visitors.
- Confirm the service area references are correct.

${buildAfterLaunchSection({
  launchDestination: "the website FAQ / answer section",
})}
`;
}

function buildSeoOperatorNotes(params: {
  actionTargetService: string;
  businessName: string;
  serviceArea: string;
  budgetLines: Array<{ label: string; percentage: number; recommendedBudget: number }>;
}) {
  return `# SEO Operator Notes

Use this folder to apply the approved SEO improvements to the client's website.

${buildPlatformBudgetSection({
  lines: params.budgetLines,
  labels: ["Website / SEO / AEO"],
})}
${buildWordPressBasicsSection()}

## What You Are Updating
SEO elements for:
- Business: ${params.businessName}
- Service: ${params.actionTargetService}
- Service Area: ${params.serviceArea}

## Exact Steps
1. Open the target page in the website CMS.
2. Open \`seo-guidance.md\`.
3. Update the page title field or SEO plugin title field using the approved guidance if needed.
4. Update the H1 only if the current H1 does not reflect the approved service focus.
5. Improve body copy using the approved service wording.
6. Add internal links from relevant pages if the guidance calls for them.
7. Preview the page.
8. Publish or update the page.

## Do Not Change These Settings
- Do not change the URL slug unless the client explicitly approved that change.
- Do not create duplicate H1 tags.
- Do not stuff keywords unnaturally.
- Do not edit unrelated pages.

## Before Publishing
- Confirm the page title is correct.
- Confirm the H1 matches the page topic.
- Confirm internal links work.
- Confirm no placeholder language remains.
- Confirm the service area wording is accurate.

${buildAfterLaunchSection({
  launchDestination: "the website SEO page",
})}
`;
}

function buildOperatorChecklist(params: {
  approvedAssetTypes: CampaignAsset["assetType"][];
}) {
  const hasGoogleBusiness = params.approvedAssetTypes.includes("GOOGLE_BUSINESS");
  const hasMeta = params.approvedAssetTypes.includes("META");
  const hasGoogleAds = params.approvedAssetTypes.includes("GOOGLE_ADS");
  const hasYelp = params.approvedAssetTypes.includes("YELP");
  const hasEmail = params.approvedAssetTypes.includes("EMAIL");
  const hasBlog = params.approvedAssetTypes.includes("BLOG");
  const hasFaq =
    params.approvedAssetTypes.includes("AEO_FAQ") ||
    params.approvedAssetTypes.includes("ANSWER_SNIPPET");
  const hasSeo = params.approvedAssetTypes.includes("SEO");

  return `# Operator Launch Checklist

Use this checklist after reading:
- 00-START-HERE.md
- 01-campaign-brief/campaign-summary.md

## Before Launch
- [ ] Confirm this is the correct client and correct campaign.
- [ ] Confirm the campaign status in MarketForge is Approved or Queued.
- [ ] Confirm business phone number.
- [ ] Confirm booking / estimate destination.
- [ ] Confirm service area.
- [ ] Confirm offer language.
- [ ] Confirm you have the right account access for every platform you are launching.
- [ ] Confirm approved image files are used where provided.
- [ ] Confirm UTM links are available from utm-tracking.txt when using URLs.

${
  hasGoogleBusiness
    ? `## Google Business Profile
- [ ] post-copy.txt reviewed
- [ ] approved image used if present
- [ ] CTA selected
- [ ] destination URL or phone checked
- [ ] post published`
    : ""
}

${
  hasMeta
    ? `## Facebook
- [ ] facebook-copy.txt reviewed
- [ ] objective selected correctly
- [ ] service area targeting checked
- [ ] image uploaded
- [ ] CTA checked
- [ ] destination URL checked
- [ ] ad or post published

## Instagram
- [ ] instagram-caption.txt reviewed
- [ ] correct placement selected
- [ ] image crop checked
- [ ] CTA / link checked
- [ ] ad or post published`
    : ""
}

${
  hasGoogleAds
    ? `## Google Ads
- [ ] Search campaign selected
- [ ] location targeting checked
- [ ] keyword themes loaded
- [ ] negative keywords loaded
- [ ] headlines and descriptions loaded
- [ ] final URL checked
- [ ] campaign published`
    : ""
}

${
  hasYelp
    ? `## Yelp
- [ ] yelp-ad-copy.txt reviewed
- [ ] phone or link checked
- [ ] offer matches Yelp policy
- [ ] content published`
    : ""
}

${
  hasEmail
    ? `## Email
- [ ] subject line checked
- [ ] preview line checked
- [ ] links tested
- [ ] test email sent
- [ ] final email sent or scheduled`
    : ""
}

${
  hasBlog
    ? `## Blog
- [ ] article pasted into CMS
- [ ] headings formatted
- [ ] CTA included
- [ ] preview checked
- [ ] article published`
    : ""
}

${
  hasFaq
    ? `## AEO / FAQ
- [ ] FAQ content published
- [ ] answer snippet published
- [ ] answers checked for accuracy
- [ ] page updated successfully`
    : ""
}

${
  hasSeo
    ? `## SEO
- [ ] title or meta title updated if needed
- [ ] H1 updated if needed
- [ ] body copy updated if needed
- [ ] internal links added if needed
- [ ] page published`
    : ""
}

## After Launch
- [ ] Confirm the live asset exists on the intended platform or page.
- [ ] Confirm the final URL / CTA works.
- [ ] Mark campaign as Launched in MarketForge.
- [ ] Add launch notes in MarketForge if anything changed during execution.
`;
}

export async function buildCampaignExportPack({
  campaign,
  profile,
}: BuildExportPackParams): Promise<{
  zipBuffer: Buffer;
  fileName: string;
  exportType: ExportType;
}> {
  const zip = new JSZip();
  const brief = safeBriefJson(campaign.briefJson);
  const estimatedRange = extractEstimatedRange(campaign.briefJson);
  const utm = generateUtmSet(campaign);

  const googleBusinessAsset = approvedAssetByType(
    campaign.assets,
    "GOOGLE_BUSINESS"
  );
  const metaAsset = approvedAssetByType(campaign.assets, "META");
  const googleAdsAsset = approvedAssetByType(campaign.assets, "GOOGLE_ADS");
  const yelpAsset = approvedAssetByType(campaign.assets, "YELP");
  const emailAsset = approvedAssetByType(campaign.assets, "EMAIL");
  const blogAsset = approvedAssetByType(campaign.assets, "BLOG");
  const aeoFaqAsset = approvedAssetByType(campaign.assets, "AEO_FAQ");
  const answerSnippetAsset = approvedAssetByType(
    campaign.assets,
    "ANSWER_SNIPPET"
  );
  const seoAsset = approvedAssetByType(campaign.assets, "SEO");

  const googleBusiness =
    parseStructuredAsset<GoogleBusinessAssetPayload>(googleBusinessAsset);
  const meta = parseStructuredAsset<MetaAssetPayload>(metaAsset);
  const email = parseStructuredAsset<EmailAssetPayload>(emailAsset);
  const blog = parseStructuredAsset<BlogAssetPayload>(blogAsset);

  const actionSpec = brief?.actionSpec ?? null;
  const actionConstruct = formatLabel(actionSpec?.constructType);
  const actionAudience =
    actionSpec?.targetAudience ??
    brief?.campaignDraft?.audience ??
    campaign.audience ??
    "Not provided";
  const actionOffer =
    actionSpec?.offerLabel ??
    brief?.campaignDraft?.offer ??
    campaign.offer ??
    "No special offer";
  const actionCta =
    actionSpec?.cta ?? brief?.campaignDraft?.cta ?? "Not provided";
  const actionWhatHappens =
    actionSpec?.whatHappensWhenLaunched ??
    actionSpec?.executionMechanism?.operatorActionSummary ??
    "Use the approved assets in this pack to launch the action manually.";
  const actionCoreMessage =
    actionSpec?.coreMessageAngle ??
    brief?.campaignDraft?.description ??
    "Not provided";
  const actionDependencies = flattenDependencyGroups(
    actionSpec?.operationalDependencies
  );
  const serviceArea =
    campaign.serviceArea ?? profile?.serviceArea ?? "Not specified";
  const targetService = campaign.targetService ?? "General service";
  const businessName = profile?.businessName ?? "Business";

  const approvedAssetTypes = campaign.assets
    .filter((asset) => asset.isApproved)
    .map((asset) => asset.assetType);

  const budgetRecommendation = getBudgetAllocationRecommendation(
    approvedAssetTypes,
    {
      revenueLow: estimatedRange?.revenueLow ?? null,
      revenueHigh:
        estimatedRange?.revenueHigh ??
        (typeof campaign.estimatedRevenue === "number"
          ? campaign.estimatedRevenue
          : 0),
    }
  );

  const sanitizedBusinessName = sanitizeForFileName(businessName);
  const sanitizedCampaignName = sanitizeForFileName(campaign.name);
  const campaignIdShort = campaign.id.slice(0, 8);
  const exportBaseName = `${sanitizedBusinessName}-${campaignIdShort}-${sanitizedCampaignName}`;

  const root = zip.folder(exportBaseName);
  if (!root) {
    throw new Error("Failed to create export root folder.");
  }

  const startHere = `# MarketForge Launch Pack

This pack is designed so that an operator with little or no platform experience can launch the approved assets step by step.

## Action Summary
- Name: ${campaign.name}
- Action Type: ${actionConstruct}
- Target Service: ${targetService}
- Who This Is For: ${actionAudience}
- Offer: ${actionOffer}
- CTA: ${actionCta}
- Service Area: ${serviceArea}

## What This Action Is Meant To Do
${actionCoreMessage}

## What Will Happen When You Launch It
${actionWhatHappens}

${buildLaunchBasicsSection({
  actionBudget: budgetRecommendation.actionBudget,
  actionCta,
  serviceArea,
  targetService,
  businessName,
})}

## What You Need Before Launch
${
  actionDependencies.length > 0
    ? actionDependencies.map((item) => `- ${item}`).join("\n")
    : "- Review the campaign summary and operator checklist before launch."
}

${buildTargetingSummaryMarkdown(actionSpec)}

## Recommended Platform Allocation
${budgetRecommendation.lines
  .map(
    (line) =>
      `- ${line.label}: ${line.percentage}% (${toCurrency(
        line.recommendedBudget
      )})`
  )
  .join("\n")}

## What Is Included In This Pack
Only approved assets are included.

- 01-campaign-brief
- 02-google-business
- 03-facebook
- 04-instagram
- 05-google-ads
- 06-yelp
- 07-email
- 08-blog
- 09-aeo
- 10-seo
- 11-operator-checklist

## Recommended Launch Order
1. Read \`01-campaign-brief/campaign-summary.md\`
2. Read \`11-operator-checklist/launch-checklist.md\`
3. Launch Google Business Profile if included
4. Launch Facebook if included
5. Launch Instagram if included
6. Launch Google Ads if included
7. Launch Yelp if included
8. Launch Email if included
9. Publish Blog content if included
10. Publish FAQ / AEO content if included
11. Apply SEO updates if included

## How To Use This Pack
Each folder contains:
- the exact approved copy to paste
- approved image files where relevant
- creative templates where relevant
- UTM guidance where relevant
- exact beginner steps
- settings to avoid changing
- common mistakes to avoid
- after-launch checks

## Creative Guidance
- Recommended image: ${
    brief?.creativeGuidance?.recommendedImage ?? "Not provided"
  }
- Avoid: ${brief?.creativeGuidance?.avoidImagery ?? "Not provided"}

${buildGlobalMistakesSection()}
`;

  root.file("00-START-HERE.md", startHere);

  root.file(
    "manifest.json",
    JSON.stringify(
      {
        campaignId: campaign.id,
        campaignCode: campaign.campaignCode,
        campaignName: campaign.name,
        exportGeneratedAt: new Date().toISOString(),
        serviceArea: campaign.serviceArea ?? profile?.serviceArea ?? null,
        targetService: campaign.targetService ?? null,
        offer: campaign.offer ?? null,
        audience: campaign.audience ?? null,
        status: campaign.status,
        actionSpec: brief?.actionSpec ?? null,
        execution: brief?.execution ?? null,
        assetsIncluded: campaign.assets
          .filter((asset) => asset.isApproved)
          .map((asset) => ({
            assetType: asset.assetType,
            title: asset.title,
          })),
      },
      null,
      2
    )
  );

  root.file(
    "utm-tracking.txt",
    `MarketForge Campaign Tracking Links

Use these only when the destination is a URL and the platform allows a URL to be edited.

Facebook Feed
${utm.facebook.feed}

Instagram Feed
${utm.instagram.feed}

Instagram Story
${utm.instagram.story}

Google Ads
${utm.googleAds.search}

Google Business Post
${utm.googleBusiness.post}

Yelp
${utm.yelp.ad}

Email
${utm.email.click}

Campaign Code
${campaign.campaignCode}
`
  );

  root.file(
    "budget-allocation-recommendation.md",
    buildBudgetRecommendationMarkdown(approvedAssetTypes)
  );

  const briefFolder = root.folder("01-campaign-brief");
  briefFolder?.file(
    "campaign-summary.md",
    `# Campaign Summary

## Campaign
- Name: ${campaign.name}
- Description: ${brief?.campaignDraft?.description ?? "Not provided"}
- Offer: ${actionOffer}
- CTA: ${actionCta}
- Audience: ${actionAudience}
- Service Area: ${serviceArea}

## Action Structure
- Action Type: ${actionConstruct}
- Business Goal: ${formatLabel(actionSpec?.businessGoal)}
- Target Service: ${
      actionSpec?.targetService ?? campaign.targetService ?? "Not provided"
    }

## Why This Audience
${actionSpec?.audienceRationale ?? "Not provided"}

${buildTargetingSummaryMarkdown(actionSpec)}

## What Will Happen When Launched
${actionWhatHappens}

## Operational Dependencies
${
  actionDependencies.length > 0
    ? actionDependencies.map((item) => `- ${item}`).join("\n")
    : "- Not provided"
}

## Message Guardrails
${bulletLines(actionSpec?.messageGuardrails, "No message guardrails stored.")}

## User Prompt
${brief?.userPrompt ?? "Not stored"}

## Parsed Intent
- Service Category: ${brief?.parsedIntent?.serviceCategory ?? "Not stored"}
- Intent: ${brief?.parsedIntent?.intent ?? "Not stored"}
- Urgency: ${brief?.parsedIntent?.urgency ?? "Not stored"}
- Timeframe: ${brief?.parsedIntent?.timeframe ?? "Not stored"}
- Promotion Type: ${brief?.parsedIntent?.promotionType ?? "Not stored"}

## Opportunity Check
- Matched Opportunity: ${
      brief?.opportunityCheck?.matchedOpportunityTitle ?? "No strong match"
    }
- Matched Recommendation: ${
      brief?.opportunityCheck?.matchedRecommendationTitle ?? "No strong match"
    }
- Confidence: ${brief?.opportunityCheck?.confidenceScore ?? "Not stored"}%
- Sources: ${(brief?.opportunityCheck?.sourceTags ?? []).join(" • ")}

## Why This Exists
${(brief?.opportunityCheck?.whyNowBullets ?? [])
  .map((item) => `- ${item}`)
  .join("\n")}

## Why This Matters
${
  brief?.opportunityCheck?.whyThisMatters ??
  brief?.opportunityCheck?.rationale ??
  "Not stored"
}

## Estimated Outcome
- Estimated Leads: ${campaign.estimatedLeads ?? 0}
- Estimated Jobs: ${campaign.estimatedBookedJobs ?? 0}
- Estimated Revenue: ${toCurrency(Number(campaign.estimatedRevenue ?? 0))}
`
  );

  const googleBusinessFolder = root.folder("02-google-business");
  googleBusinessFolder?.file(
    "post-copy.txt",
    googleBusiness
      ? `${googleBusiness.title}

${googleBusiness.description}

CTA: ${googleBusiness.cta}`
      : "No approved Google Business asset found."
  );
  const googleBusinessAiImageIncluded = await addAiImageToFolder({
    folder: googleBusinessFolder,
    fileBaseName: "google-business-approved-creative",
    asset: googleBusinessAsset,
  });
  googleBusinessFolder?.file(
    "approved-image-note.txt",
    googleBusinessAiImageIncluded
      ? "Use the approved AI-generated image file in this folder when publishing the Google Business post."
      : "No approved AI-generated image file was stored for this asset. Use the approved copy and existing fallback image guidance."
  );
  googleBusinessFolder?.file(
    "operator-notes.md",
    buildGoogleBusinessOperatorNotes({
      campaignName: campaign.name,
      actionOffer,
      actionCta,
      actionAudience,
      actionTargetService: targetService,
      actionDependencies,
      budgetLines: budgetRecommendation.lines,
      actionSpec,
      utm: utm.googleBusiness.post,
      serviceArea,
      businessName,
    })
  );
  googleBusinessFolder?.file(
    "google-business-square-template-720x720.svg",
    svgTemplate({
      width: 720,
      height: 720,
      title: campaign.name,
      subtitle: campaign.offer ?? "Google Business creative template",
      safeArea: "Keep key text/logo inside the dashed area.",
    })
  );

  const facebookFolder = root.folder("03-facebook");
  facebookFolder?.file(
    "facebook-copy.txt",
    meta
      ? `Headline: ${meta.headline}

Primary Text:
${meta.primaryText}

CTA: ${meta.cta}`
      : "No approved Facebook / Meta copy found."
  );
  const facebookAiImageIncluded = await addAiImageToFolder({
    folder: facebookFolder,
    fileBaseName: "facebook-approved-creative",
    asset: metaAsset,
  });
  facebookFolder?.file(
    "approved-image-note.txt",
    facebookAiImageIncluded
      ? "Use the approved AI-generated image file in this folder when creating the Facebook ad."
      : "No approved AI-generated image file was stored for this asset. Use the approved copy and fallback image guidance."
  );
  facebookFolder?.file(
    "operator-notes.md",
    buildFacebookOperatorNotes({
      actionOffer,
      actionCta,
      actionAudience,
      actionTargetService: targetService,
      budgetLines: budgetRecommendation.lines,
      actionSpec,
      utm: utm.facebook.feed,
    })
  );
  facebookFolder?.file(
    "facebook-feed-template-1080x1080.svg",
    svgTemplate({
      width: 1080,
      height: 1080,
      title: campaign.name,
      subtitle: campaign.offer ?? "Facebook feed creative",
      safeArea: "Square feed format",
    })
  );
  facebookFolder?.file(
    "facebook-wide-template-1200x628.svg",
    svgTemplate({
      width: 1200,
      height: 628,
      title: campaign.name,
      subtitle: campaign.offer ?? "Facebook wide creative",
      safeArea: "Recommended for link ads",
    })
  );

  const instagramFolder = root.folder("04-instagram");
  instagramFolder?.file(
    "instagram-caption.txt",
    meta
      ? `Headline: ${meta.headline}

Primary Text:
${meta.primaryText}

CTA: ${meta.cta}`
      : "No approved Instagram / Meta copy found."
  );
  const instagramAiImageIncluded = await addAiImageToFolder({
    folder: instagramFolder,
    fileBaseName: "instagram-approved-creative",
    asset: metaAsset,
  });
  instagramFolder?.file(
    "approved-image-note.txt",
    instagramAiImageIncluded
      ? "Use the approved AI-generated image file in this folder when creating the Instagram ad."
      : "No approved AI-generated image file was stored for this asset. Use the approved copy and fallback image guidance."
  );
  instagramFolder?.file(
    "operator-notes.md",
    buildInstagramOperatorNotes({
      actionOffer,
      actionCta,
      actionAudience,
      actionTargetService: targetService,
      budgetLines: budgetRecommendation.lines,
      actionSpec,
      utmFeed: utm.instagram.feed,
      utmStory: utm.instagram.story,
    })
  );
  instagramFolder?.file(
    "instagram-feed-square-1080x1080.svg",
    svgTemplate({
      width: 1080,
      height: 1080,
      title: campaign.name,
      subtitle: campaign.offer ?? "Instagram feed square",
      safeArea: "Keep key content centered",
    })
  );
  instagramFolder?.file(
    "instagram-feed-vertical-1080x1350.svg",
    svgTemplate({
      width: 1080,
      height: 1350,
      title: campaign.name,
      subtitle: campaign.offer ?? "Instagram vertical feed",
      safeArea: "Best performing feed ratio",
    })
  );
  instagramFolder?.file(
    "instagram-stories-1080x1920.svg",
    svgTemplate({
      width: 1080,
      height: 1920,
      title: campaign.name,
      subtitle: campaign.offer ?? "Stories / Reels creative",
      safeArea: "Avoid text near edges",
    })
  );

  const googleAdsFolder = root.folder("05-google-ads");
  googleAdsFolder?.file(
    "search-assets.txt",
    googleAdsAsset?.content ?? "No approved Google Ads copy found."
  );
  const googleAdsAiImageIncluded = await addAiImageToFolder({
    folder: googleAdsFolder,
    fileBaseName: "google-ads-approved-creative",
    asset: googleAdsAsset,
  });
  googleAdsFolder?.file(
    "approved-image-note.txt",
    googleAdsAiImageIncluded
      ? "Use the approved AI-generated image file in this folder for the Google Ads image creative associated with this action."
      : "No approved AI-generated image file was stored for this asset. Use the approved copy and fallback image guidance."
  );
  googleAdsFolder?.file(
    "operator-notes.md",
    buildGoogleAdsOperatorNotes({
      actionCta,
      actionTargetService: targetService,
      actionAudience,
      budgetLines: budgetRecommendation.lines,
      actionSpec,
      utm: utm.googleAds.search,
      serviceArea,
    })
  );

  const yelpFolder = root.folder("06-yelp");
  yelpFolder?.file(
    "yelp-ad-copy.txt",
    yelpAsset?.content ?? "No approved Yelp ad copy found."
  );
  yelpFolder?.file(
    "operator-notes.md",
    buildYelpOperatorNotes({
      actionOffer,
      actionCta,
      actionTargetService: targetService,
      budgetLines: budgetRecommendation.lines,
      utm: utm.yelp.ad,
      serviceArea,
    })
  );
  yelpFolder?.file(
    "yelp-square-template-1080x1080.svg",
    svgTemplate({
      width: 1080,
      height: 1080,
      title: campaign.name,
      subtitle: campaign.offer ?? "Yelp creative template",
      safeArea: "Local service-focused square creative",
    })
  );

  const emailFolder = root.folder("07-email");
  emailFolder?.file(
    "email-copy.txt",
    email
      ? `Subject: ${email.subject}
Preview Line: ${email.previewLine}

${email.body}

CTA: ${email.cta}`
      : "No approved email asset found."
  );
  emailFolder?.file(
    "operator-notes.md",
    buildEmailOperatorNotes({
      actionOffer,
      actionCta,
      actionAudience,
      actionTargetService: targetService,
      budgetLines: budgetRecommendation.lines,
      utm: utm.email.click,
    })
  );

  const blogFolder = root.folder("08-blog");
  blogFolder?.file("blog-article.md", buildBlogArticleMarkdown(blog));
  blogFolder?.file(
    "operator-notes.md",
    buildBlogOperatorNotes({
      actionCta,
      actionTargetService: targetService,
      serviceArea,
      budgetLines: budgetRecommendation.lines,
    })
  );

  const aeoFolder = root.folder("09-aeo");
  aeoFolder?.file(
    "faq-content.md",
    aeoFaqAsset?.content ?? "No approved FAQ asset found."
  );
  aeoFolder?.file(
    "answer-snippet.txt",
    answerSnippetAsset?.content ?? "No approved answer snippet found."
  );
  aeoFolder?.file(
    "operator-notes.md",
    buildAeoOperatorNotes({
      actionTargetService: targetService,
      serviceArea,
      budgetLines: budgetRecommendation.lines,
    })
  );

  const seoFolder = root.folder("10-seo");
  seoFolder?.file(
    "seo-guidance.md",
    `# SEO Optimization Guidance

## Target Service
${targetService}

## Existing SEO Asset
${seoAsset?.content ?? "No separate SEO asset stored."}

## Suggested Keywords

Primary keywords
- ${targetService} near me
- ${targetService} ${serviceArea}
- local ${targetService}

Secondary keywords
- ${targetService} cost
- ${targetService} quote
- trusted ${targetService}

## Suggested Page Updates

If a page exists, update:

Title Tag
"${targetService} in ${serviceArea} | ${businessName}"

H1
"${targetService} in ${serviceArea}"

## Internal Linking Suggestions

Link from:
- homepage
- related services
- FAQ page
- recent blog posts

Anchor text examples:
- "${targetService}"
- "${serviceArea} ${targetService}"
- "${businessName}"

## Local SEO
Ensure service area is clearly stated on:
- homepage
- target page
- Google Business listing
`
  );
  seoFolder?.file(
    "operator-notes.md",
    buildSeoOperatorNotes({
      actionTargetService: targetService,
      businessName,
      serviceArea,
      budgetLines: budgetRecommendation.lines,
    })
  );

  const opsFolder = root.folder("11-operator-checklist");
  opsFolder?.file(
    "launch-checklist.md",
    buildOperatorChecklist({
      approvedAssetTypes,
    })
  );

  const zipBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return {
    zipBuffer,
    fileName: `${exportBaseName}.zip`,
    exportType: "CAMPAIGN_PACK",
  };
}