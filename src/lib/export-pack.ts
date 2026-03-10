import JSZip from "jszip";
import {
  Campaign,
  CampaignAsset,
  BusinessProfile,
  ExportType,
  Prisma,
} from "@/generated/prisma";

type CampaignWithAssets = Campaign & {
  assets: CampaignAsset[];
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
  };
};

function safeBriefJson(value: Prisma.JsonValue | null): BriefJsonShape | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as BriefJsonShape;
}

function assetByType(
  assets: CampaignAsset[],
  type: CampaignAsset["assetType"]
) {
  return assets.find((asset) => asset.assetType === type) ?? null;
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
  };
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
  const utm = generateUtmSet(campaign);

  const googleBusiness = assetByType(campaign.assets, "GOOGLE_BUSINESS");
  const meta = assetByType(campaign.assets, "META");
  const googleAds = assetByType(campaign.assets, "GOOGLE_ADS");
  const email = assetByType(campaign.assets, "EMAIL");
  const blog = assetByType(campaign.assets, "BLOG");
  const aeoFaq = assetByType(campaign.assets, "AEO_FAQ");
  const answerSnippet = assetByType(campaign.assets, "ANSWER_SNIPPET");
  const seoAsset = assetByType(campaign.assets, "SEO");

  const fileSafeCampaignName = campaign.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const root = zip.folder(`marketforge-export-${fileSafeCampaignName}`);
  if (!root) {
    throw new Error("Failed to create export root folder.");
  }

  const startHere = `# MarketForge Launch Pack

This pack is designed so an operator can launch this campaign with minimal guesswork.

## Campaign
- Name: ${campaign.name}
- Target Service: ${campaign.targetService ?? "General plumbing"}
- Offer: ${campaign.offer ?? "See campaign brief"}
- Audience: ${campaign.audience ?? "See campaign brief"}
- Service Area: ${campaign.serviceArea ?? profile?.serviceArea ?? "Not specified"}

## Recommended operator order
1. Read \`01-campaign-brief/campaign-summary.md\`
2. Use \`02-google-business/\` for Google Business Profile posting
3. Use \`03-facebook/\` for Facebook posting or ad setup
4. Use \`04-instagram/\` for Instagram feed / story / reel setup
5. Use \`05-google-ads/\` for search ad copy
6. Use \`06-email/\` if email is being sent
7. Use \`07-blog/\` and \`08-aeo/\` for site/content updates
8. Use \`09-seo/\` for search optimization guidance
9. Follow \`10-operator-checklist/launch-checklist.md\`

## Creative guidance
- Recommended image: ${brief?.creativeGuidance?.recommendedImage ?? "Not provided"}
- Avoid: ${brief?.creativeGuidance?.avoidImagery ?? "Not provided"}

## Notes
This pack includes editable SVG templates sized for common operator workflows:
- Google Business square image
- Facebook feed square
- Facebook wide/link ad
- Instagram feed square
- Instagram feed vertical 4:5
- Instagram Stories / Reels 9:16

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
        status: campaign.status,
        execution: brief?.execution ?? null,
        assetsIncluded: campaign.assets.map((asset) => ({
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

Campaign Code
${campaign.campaignCode}
`
);

  const briefFolder = root.folder("01-campaign-brief");
  briefFolder?.file(
    "campaign-summary.md",
    `# Campaign Summary

## Campaign
- Name: ${campaign.name}
- Description: ${brief?.campaignDraft?.description ?? "Not provided"}
- Offer: ${brief?.campaignDraft?.offer ?? campaign.offer ?? "Not provided"}
- CTA: ${brief?.campaignDraft?.cta ?? "Not provided"}
- Audience: ${brief?.campaignDraft?.audience ?? campaign.audience ?? "Not provided"}

## User Prompt
${brief?.userPrompt ?? "Not stored"}

## Parsed Intent
- Service Category: ${brief?.parsedIntent?.serviceCategory ?? "Not stored"}
- Intent: ${brief?.parsedIntent?.intent ?? "Not stored"}
- Urgency: ${brief?.parsedIntent?.urgency ?? "Not stored"}
- Timeframe: ${brief?.parsedIntent?.timeframe ?? "Not stored"}
- Promotion Type: ${brief?.parsedIntent?.promotionType ?? "Not stored"}

## Opportunity Check
- Matched Opportunity: ${brief?.opportunityCheck?.matchedOpportunityTitle ?? "No strong match"}
- Matched Recommendation: ${brief?.opportunityCheck?.matchedRecommendationTitle ?? "No strong match"}
- Confidence: ${brief?.opportunityCheck?.confidenceScore ?? "Not stored"}%
- Sources: ${(brief?.opportunityCheck?.sourceTags ?? []).join(" • ")}

## Why This Exists
${(brief?.opportunityCheck?.whyNowBullets ?? []).map((item) => `- ${item}`).join("\n")}

## Why This Matters
${brief?.opportunityCheck?.whyThisMatters ?? brief?.opportunityCheck?.rationale ?? "Not stored"}

## Estimated Outcome
- Estimated Leads: ${campaign.estimatedLeads ?? 0}
- Estimated Jobs: ${campaign.estimatedBookedJobs ?? 0}
- Estimated Revenue: ${toCurrency(Number(campaign.estimatedRevenue ?? 0))}
`
  );

  const googleBusinessFolder = root.folder("02-google-business");
  googleBusinessFolder?.file(
    "post-copy.txt",
    googleBusiness?.content ?? "No Google Business post found."
  );
  googleBusinessFolder?.file(
    "image-guidelines.md",
    `# Google Business Profile Image Guidelines

Recommended operator image:
- Format: JPG or PNG
- Recommended resolution: 720 x 720
- Minimum resolution: 250 x 250

Use the included square template if you need a fast starting canvas.
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
    meta?.content ?? "No Facebook copy found."
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
    meta?.content ?? "No Instagram caption found."
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
    googleAds?.content ?? "No Google Ads copy found."
  );
  googleAdsFolder?.file(
    "operator-notes.md",
    `# Google Ads Operator Notes

This pack currently assumes a search-first workflow:
- use the provided headlines and descriptions
- confirm final destination URL and phone CTA before publishing

If you later run display or Performance Max creative, create image variants from the Facebook / Instagram templates.
`
  );

  const emailFolder = root.folder("06-email");
  emailFolder?.file("email-copy.txt", email?.content ?? "No email asset found.");

  const blogFolder = root.folder("07-blog");
  blogFolder?.file("blog-outline.md", blog?.content ?? "No blog outline found.");

  const aeoFolder = root.folder("08-aeo");
  aeoFolder?.file("faq-content.md", aeoFaq?.content ?? "No FAQ asset found.");
  aeoFolder?.file(
    "answer-snippet.txt",
    answerSnippet?.content ?? "No answer snippet found."
  );

  const seoFolder = root.folder("09-seo");
  seoFolder?.file(
    "seo-guidance.md",
    `# SEO Optimization Guidance

## Target Service
${campaign.targetService ?? "General plumbing"}

## Existing SEO Asset
${seoAsset?.content ?? "No separate SEO asset stored."}

## Suggested Keywords

Primary keywords
- ${campaign.targetService ?? "plumbing service"} near me
- ${campaign.targetService ?? "plumbing service"} ${campaign.serviceArea ?? ""}
- emergency ${campaign.targetService ?? "plumber"}

Secondary keywords
- affordable ${campaign.targetService ?? "plumbing service"}
- same day ${campaign.targetService ?? "plumbing service"}
- local ${campaign.targetService ?? "plumber"}

## Suggested Page Updates

If a service page exists, update:

Title Tag
"${campaign.targetService ?? "Plumbing"} in ${campaign.serviceArea ?? "Your Area"} | ${profile?.businessName ?? "Local Experts"}"

H1
"${campaign.targetService ?? "Plumbing"} Services in ${campaign.serviceArea ?? "Your Area"}"

## Internal Linking Suggestions

Link from:
- homepage
- related services
- FAQ page
- recent blog posts

Anchor text examples:
- "${campaign.targetService ?? "drain cleaning"} services"
- "emergency ${campaign.targetService ?? "plumber"}"
- "${campaign.serviceArea ?? "local"} plumbing experts"

## Local SEO

Ensure service area is clearly stated on:
- homepage
- service page
- Google Business listing
`
  );

  const opsFolder = root.folder("10-operator-checklist");
  opsFolder?.file(
    "launch-checklist.md",
    `# Operator Launch Checklist

## Before launch
- [ ] Confirm business phone number
- [ ] Confirm booking or estimate destination
- [ ] Confirm offer language
- [ ] Confirm service area naming
- [ ] Confirm campaign status is Approved or Queued for Launch
- [ ] Confirm credentials / account access are received

## Google Business
- [ ] Post copy added
- [ ] Square image exported from template
- [ ] Business profile posting complete

## Facebook
- [ ] Correct format selected (square or wide)
- [ ] Copy pasted from facebook-copy.txt
- [ ] CTA checked
- [ ] Destination URL / phone checked

## Instagram
- [ ] Correct format selected (square, vertical, or stories)
- [ ] Caption pasted from instagram-caption.txt
- [ ] Visual exported from correct template
- [ ] Text placement checked for crop safety

## Google Ads
- [ ] Headlines loaded
- [ ] Descriptions loaded
- [ ] Final URL checked
- [ ] Phone / call extension checked if applicable

## SEO / Website
- [ ] SEO guidance reviewed
- [ ] Service page updated if needed
- [ ] Internal links added if needed
- [ ] FAQ / answer content published if needed

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
    fileName: `marketforge-export-${fileSafeCampaignName}.zip`,
    exportType: "CAMPAIGN_PACK",
  };
}