import JSZip from "jszip";
import {
  Campaign,
  CampaignAsset,
  BusinessProfile,
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
  const googleAds = approvedAssetByType(campaign.assets, "GOOGLE_ADS");
  const yelp = approvedAssetByType(campaign.assets, "YELP");
  const emailAsset = approvedAssetByType(campaign.assets, "EMAIL");
  const blogAsset = approvedAssetByType(campaign.assets, "BLOG");
  const aeoFaq = approvedAssetByType(campaign.assets, "AEO_FAQ");
  const answerSnippet = approvedAssetByType(campaign.assets, "ANSWER_SNIPPET");
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

  const businessName = sanitizeForFileName(profile?.businessName ?? "Business");
  const campaignName = sanitizeForFileName(campaign.name);
  const campaignIdShort = campaign.id.slice(0, 8);
  const exportBaseName = `${businessName}-${campaignIdShort}-${campaignName}`;

  const root = zip.folder(exportBaseName);
  if (!root) {
    throw new Error("Failed to create export root folder.");
  }

  const startHere = `# MarketForge Launch Pack

This pack is designed so that an operator with little or no platform experience can launch the approved assets step by step.

## Action Summary
- Name: ${campaign.name}
- Action Type: ${actionConstruct}
- Target Service: ${campaign.targetService ?? "General service"}
- Who This Is For: ${actionAudience}
- Offer: ${actionOffer}
- CTA: ${actionCta}
- Service Area: ${campaign.serviceArea ?? profile?.serviceArea ?? "Not specified"}

## What This Action Is Meant To Do
${actionCoreMessage}

## What Will Happen When You Launch It
${actionWhatHappens}

## What You Need Before Launch
${
  actionDependencies.length > 0
    ? actionDependencies.map((item) => `- ${item}`).join("\n")
    : "- Review the campaign summary and operator checklist before launch."
}

## Budget Guidance
- Action Budget: ${toCurrency(budgetRecommendation.actionBudget)}

## Recommended Platform Allocation
${budgetRecommendation.lines
  .map(
    (line) =>
      `- ${line.label}: ${line.percentage}% (${toCurrency(
        line.recommendedBudget
      )})`
  )
  .join("\n")}

## What is included in this pack
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

## Recommended launch order
1. Read \`01-campaign-brief/campaign-summary.md\`
2. Read \`11-operator-checklist/launch-checklist.md\`
3. Complete Google Business if included
4. Complete Facebook if included
5. Complete Instagram if included
6. Complete Google Ads if included
7. Complete Yelp if included
8. Complete Email if included
9. Publish the Blog if included
10. Apply AEO + Answer Snippet content if included
11. Apply SEO guidance if included

## How to use this pack
Each folder contains:
- the exact approved copy to paste
- approved image files where relevant
- creative templates where relevant
- UTM guidance where relevant
- checks to complete before publishing

## Creative guidance
- Recommended image: ${
    brief?.creativeGuidance?.recommendedImage ?? "Not provided"
  }
- Avoid: ${brief?.creativeGuidance?.avoidImagery ?? "Not provided"}

## Important notes
- If a folder says “No approved asset found,” that platform was not approved for launch.
- Launch only the assets included in this pack.
- Do not invent extra copy unless the client explicitly requests changes.
- Use the budget guidance in this file and in each platform folder when launching.
- If an approved AI-generated image file is included in a platform folder, use that exact image in execution so the launched creative matches the user-approved preview.
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

## Action Structure
- Action Type: ${actionConstruct}
- Business Goal: ${formatLabel(actionSpec?.businessGoal)}
- Target Service: ${
      actionSpec?.targetService ?? campaign.targetService ?? "Not provided"
    }

## Why This Audience
${actionSpec?.audienceRationale ?? "Not provided"}

## What Will Happen When Launched
${actionWhatHappens}

## What You Need Before Launch
${
  actionDependencies.length > 0
    ? actionDependencies.map((item) => `- ${item}`).join("\n")
    : "- Not provided"
}

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
      ? `${googleBusiness.title}\n\n${googleBusiness.description}\n\nCTA: ${googleBusiness.cta}`
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
    `# Google Business Profile Operator Notes

Use this folder to create and publish a Google Business Profile post.

${buildPlatformBudgetSection({
  lines: budgetRecommendation.lines,
  labels: ["Google Business Profile"],
})}
Step-by-step
1. Open the client's Google Business Profile
2. Navigate to Posts or Updates
3. Choose the most relevant post type
4. Paste the copy from post-copy.txt
5. Upload the approved image file in this folder if one is included; otherwise use the fallback image guidance
6. Select the CTA button that best matches the offer
7. Add the correct destination URL or phone number
8. Preview the post
9. Publish or schedule it

Before publishing
- Confirm the phone number is correct
- Confirm the destination URL works
- Confirm the service area wording matches the business profile
- Confirm the offer language matches what was approved
- Confirm the image is readable on mobile

Recommended UTM
${utm.googleBusiness.post}
`
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
      ? `${meta.headline}\n\n${meta.primaryText}\n\nCTA: ${meta.cta}`
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
    `# Facebook Operator Notes

Use this folder for Facebook posting or ad setup.

${buildPlatformBudgetSection({
  lines: budgetRecommendation.lines,
  labels: ["Facebook & Instagram"],
})}
Step-by-step
1. Open Facebook Business Manager or the Facebook Page
2. Create the post or ad
3. Paste the copy from facebook-copy.txt
4. Upload the approved image file in this folder if one is included; otherwise use the fallback image guidance
5. Confirm the CTA
6. Confirm the destination URL or phone number
7. Preview the ad or post
8. Publish or schedule it

Before publishing
- Confirm the destination URL works
- Confirm the CTA matches the approved campaign
- Confirm the creative image is the correct ratio
- Confirm the service and offer language are accurate
- Confirm the correct account and page are selected

Recommended UTM
${utm.facebook.feed}
`
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
      ? `${meta.headline}\n\n${meta.primaryText}\n\nCTA: ${meta.cta}`
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
    `# Instagram Operator Notes

Use this folder for Instagram feed, story, or reel setup.

${buildPlatformBudgetSection({
  lines: budgetRecommendation.lines,
  labels: ["Facebook & Instagram"],
})}
Step-by-step
1. Open Instagram scheduling or Meta Business Suite
2. Choose Feed, Story, or Reel placement
3. Paste the copy from instagram-caption.txt
4. Upload the approved image file in this folder if one is included; otherwise use the fallback image guidance
5. Confirm CTA or profile link destination
6. Preview the post
7. Publish or schedule it

Before publishing
- Confirm the image size matches the selected placement
- Confirm the caption reads cleanly on mobile
- Confirm the CTA and service language are correct
- Confirm the correct Instagram account is selected

Recommended UTM
Feed: ${utm.instagram.feed}
Story: ${utm.instagram.story}
`
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
    googleAds?.content ?? "No approved Google Ads copy found."
  );
  const googleAdsAiImageIncluded = await addAiImageToFolder({
    folder: googleAdsFolder,
    fileBaseName: "google-ads-approved-creative",
    asset: googleAds,
  });
  googleAdsFolder?.file(
    "approved-image-note.txt",
    googleAdsAiImageIncluded
      ? "Use the approved AI-generated image file in this folder for the Google Ads image creative associated with this action."
      : "No approved AI-generated image file was stored for this asset. Use the approved copy and fallback image guidance."
  );
  googleAdsFolder?.file(
    "operator-notes.md",
    `# Google Ads Operator Notes

Use this folder to load the approved search ad copy into Google Ads.

${buildPlatformBudgetSection({
  lines: budgetRecommendation.lines,
  labels: ["Google Ads"],
})}
Step-by-step
1. Open the correct Google Ads account
2. Create a new Search campaign or open the intended ad group
3. Copy the approved headlines and descriptions from search-assets.txt
4. Upload the approved image file in this folder if one is included and the format is being used in execution
5. Add the correct final URL
6. Confirm the phone number or call extension if used
7. Confirm targeting matches the business service area
8. Review ad strength and fix any missing required fields
9. Save and publish

Before publishing
- Confirm the destination URL works correctly
- Confirm the CTA and offer match the approved campaign
- Confirm targeting matches the intended geography
- Confirm tracking and campaign code are included where needed

Recommended UTM
${utm.googleAds.search}
`
  );

  const yelpFolder = root.folder("06-yelp");
  yelpFolder?.file(
    "yelp-ad-copy.txt",
    yelp?.content ?? "No approved Yelp ad copy found."
  );
  yelpFolder?.file(
    "operator-notes.md",
    `# Yelp Operator Notes

Use this folder for Yelp promoted listing, ad setup, or business update workflows.

${buildPlatformBudgetSection({
  lines: budgetRecommendation.lines,
  labels: ["Yelp"],
})}
Step-by-step
1. Open the business Yelp account
2. Navigate to the correct ad or business content section
3. Paste the approved copy from yelp-ad-copy.txt
4. Add the correct CTA or booking link
5. Confirm service area language matches the Yelp profile
6. Confirm the phone number is correct
7. Preview the content
8. Publish or schedule it

Before publishing
- Confirm the offer language complies with Yelp policy
- Confirm the destination URL or phone CTA is correct
- Confirm the copy matches the approved campaign
- Confirm tracking is added if a link is used

Recommended UTM
${utm.yelp.ad}
`
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
      ? `Subject: ${email.subject}\nPreview Line: ${email.previewLine}\n\n${email.body}\n\nCTA: ${email.cta}`
      : "No approved email asset found."
  );
  emailFolder?.file(
    "operator-notes.md",
    `# Email Operator Notes

Use this folder to send the approved campaign email.

${buildPlatformBudgetSection({
  lines: budgetRecommendation.lines,
  labels: ["Email"],
})}
Step-by-step
1. Open the client's email platform
2. Create a new campaign or draft
3. Paste the copy from email-copy.txt
4. Add the correct subject line if provided
5. Confirm the CTA link or phone number
6. Send a test email to yourself
7. Review spacing, formatting, and mobile rendering
8. Schedule or send the email

Before sending
- Confirm links work correctly
- Confirm the CTA matches the approved campaign
- Confirm the offer and service naming are correct
- Confirm no placeholder text remains
- Confirm the sender and reply-to addresses are correct

Recommended UTM
${utm.email.click}
`
  );

  const blogFolder = root.folder("08-blog");
  blogFolder?.file("blog-article.md", buildBlogArticleMarkdown(blog));
  blogFolder?.file(
    "operator-notes.md",
    `# Blog Operator Notes

Use this folder to publish the approved blog article on the client's website.

${buildPlatformBudgetSection({
  lines: budgetRecommendation.lines,
  labels: ["Website / SEO / AEO"],
})}
Step-by-step
1. Open the website CMS or blog editor
2. Create a new post
3. Copy the content from blog-article.md
4. Paste it into the blog editor
5. Format headings, bullets, and paragraphs as needed
6. Add the correct feature image
7. Confirm internal links and CTA placement
8. Preview the article on desktop and mobile
9. Publish or schedule the article

Before publishing
- Confirm the article title is correct
- Confirm the service and city references are accurate
- Confirm there is a CTA in the article
- Confirm headings are formatted cleanly
- Confirm no draft notes or placeholders remain
`
  );

  const aeoFolder = root.folder("09-aeo");
  aeoFolder?.file(
    "faq-content.md",
    aeoFaq?.content ?? "No approved FAQ asset found."
  );
  aeoFolder?.file(
    "answer-snippet.txt",
    answerSnippet?.content ?? "No approved answer snippet found."
  );
  aeoFolder?.file(
    "operator-notes.md",
    `# AEO Operator Notes

Use this folder to improve answer-engine visibility through FAQ and short-form answer content.

${buildPlatformBudgetSection({
  lines: budgetRecommendation.lines,
  labels: ["Website / SEO / AEO"],
})}
Step-by-step
1. Open the website page where FAQ or answer content should live
2. Copy the content from faq-content.md into the FAQ section
3. Copy the content from answer-snippet.txt into the short-answer area if relevant
4. Confirm formatting is clean and readable
5. Confirm answers are accurate for the business
6. Publish the updated content
7. Recheck the page after publishing

Before publishing
- Confirm all answers are specific to the business
- Confirm no unsupported claims are included
- Confirm service area references are correct
- Confirm the content is easy to scan and understand
`
  );

  const seoFolder = root.folder("10-seo");
  seoFolder?.file(
    "seo-guidance.md",
    `# SEO Optimization Guidance

## Target Service
${campaign.targetService ?? "General service"}

## Existing SEO Asset
${seoAsset?.content ?? "No separate SEO asset stored."}

## Suggested Keywords

Primary keywords
- ${campaign.targetService ?? "local service"} near me
- ${campaign.targetService ?? "local service"} ${campaign.serviceArea ?? ""}
- local ${campaign.targetService ?? "service expert"}

Secondary keywords
- affordable ${campaign.targetService ?? "local service"}
- same day ${campaign.targetService ?? "local service"}
- trusted ${campaign.targetService ?? "local professional"}

## Suggested Page Updates

If a page exists, update:

Title Tag
"${campaign.targetService ?? "Service"} in ${
      campaign.serviceArea ?? "Your Area"
    } | ${profile?.businessName ?? "Local Experts"}"

H1
"${campaign.targetService ?? "Service"} in ${
      campaign.serviceArea ?? "Your Area"
    }"

## Internal Linking Suggestions

Link from:
- homepage
- related services
- FAQ page
- recent blog posts

Anchor text examples:
- "${campaign.targetService ?? "service"}"
- "${campaign.serviceArea ?? "local"} ${campaign.targetService ?? "service"}"
- "${profile?.businessName ?? "local experts"}"

## Local SEO

Ensure service area is clearly stated on:
- homepage
- target page
- Google Business listing
`
  );
  seoFolder?.file(
    "operator-notes.md",
    `# SEO Operator Notes

Use this folder to apply the approved SEO improvements to the client's site.

${buildPlatformBudgetSection({
  lines: budgetRecommendation.lines,
  labels: ["Website / SEO / AEO"],
})}
Step-by-step
1. Open the target page in the CMS
2. Review seo-guidance.md
3. Update the title tag if needed
4. Update the H1 if needed
5. Improve body copy using the approved target service language
6. Add internal links from relevant pages
7. Confirm service area language is correct
8. Publish the page updates
9. Recheck the live page after publishing

Before publishing
- Confirm all edits match the approved service focus
- Confirm internal links work
- Confirm the page title and H1 are not duplicated elsewhere
- Confirm no placeholder language remains
`
  );

  const opsFolder = root.folder("11-operator-checklist");
  opsFolder?.file(
    "launch-checklist.md",
    `# Operator Launch Checklist

Use this checklist only after reviewing 00-START-HERE.md and 01-campaign-brief/campaign-summary.md.

Complete each relevant channel in order and check every item before marking the action as launched.

## Before launch
- [ ] Confirm who this action is for
- [ ] Confirm what this action is meant to do
- [ ] Confirm action budget in 00-START-HERE.md
- [ ] Confirm platform budget in the channel operator notes
- [ ] Confirm business phone number
- [ ] Confirm booking or estimate destination
- [ ] Confirm offer language
- [ ] Confirm service area naming
- [ ] Confirm campaign status is Approved or Queued for Launch
- [ ] Confirm credentials / account access are received

## Google Business
- [ ] Post copy added
- [ ] Approved AI image used if included in folder
- [ ] Business profile posting complete

## Facebook
- [ ] Correct format selected
- [ ] Copy pasted from facebook-copy.txt
- [ ] Approved AI image used if included in folder
- [ ] CTA checked
- [ ] Destination URL / phone checked

## Instagram
- [ ] Correct format selected
- [ ] Caption pasted from instagram-caption.txt
- [ ] Approved AI image used if included in folder
- [ ] Text placement checked for crop safety

## Google Ads
- [ ] Headlines loaded
- [ ] Descriptions loaded
- [ ] Approved AI image used if included in folder
- [ ] Final URL checked
- [ ] Phone / call extension checked if applicable

## Yelp
- [ ] Yelp copy reviewed
- [ ] Offer matches profile policy
- [ ] Destination / call CTA checked
- [ ] UTM applied if link is used

## Email
- [ ] Subject line checked
- [ ] Body checked
- [ ] Test email sent
- [ ] Links confirmed

## Blog
- [ ] Article pasted into CMS
- [ ] Formatting checked
- [ ] CTA confirmed
- [ ] Feature image added

## AEO / FAQ
- [ ] FAQ content published
- [ ] Answer snippet published
- [ ] Accuracy checked

## SEO / Website
- [ ] SEO guidance reviewed
- [ ] Title/H1 updated if needed
- [ ] Internal links added if needed

## After launch
- [ ] Mark campaign as Launched in MarketForge
- [ ] Add any launch notes
- [ ] Monitor leads and update lead status
`
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