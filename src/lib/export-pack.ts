import JSZip from "jszip";
import {
  Campaign,
  CampaignAsset,
  BusinessProfile,
  ExportType,
  Prisma,
} from "@/generated/prisma";
import { buildBudgetRecommendationMarkdown } from "@/lib/budget-allocation-recommendations";

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

function approvedAssetByType(
  assets: CampaignAsset[],
  type: CampaignAsset["assetType"]
) {
  return assets.find(
    (asset) => asset.assetType === type && asset.isApproved
  ) ?? null;
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

function sanitizeForFileName(value: string) {
  return value
    .replace(/[^a-zA-Z0-9-_ ]+/g, "")
    .trim()
    .replace(/\s+/g, "-");
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
  const utm = generateUtmSet(campaign);

  const googleBusinessAsset = approvedAssetByType(campaign.assets, "GOOGLE_BUSINESS");
  const metaAsset = approvedAssetByType(campaign.assets, "META");
  const googleAds = approvedAssetByType(campaign.assets, "GOOGLE_ADS");
  const yelp = approvedAssetByType(campaign.assets, "YELP");
  const emailAsset = approvedAssetByType(campaign.assets, "EMAIL");
  const blogAsset = approvedAssetByType(campaign.assets, "BLOG");
  const aeoFaq = approvedAssetByType(campaign.assets, "AEO_FAQ");
  const answerSnippet = approvedAssetByType(campaign.assets, "ANSWER_SNIPPET");
  const seoAsset = approvedAssetByType(campaign.assets, "SEO");

  const googleBusiness = parseStructuredAsset<GoogleBusinessAssetPayload>(googleBusinessAsset);
  const meta = parseStructuredAsset<MetaAssetPayload>(metaAsset);
  const email = parseStructuredAsset<EmailAssetPayload>(emailAsset);
  const blog = parseStructuredAsset<BlogAssetPayload>(blogAsset);

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

## Campaign
- Name: ${campaign.name}
- Target Service: ${campaign.targetService ?? "General service"}
- Offer: ${campaign.offer ?? "See campaign brief"}
- Audience: ${campaign.audience ?? "See campaign brief"}
- Service Area: ${campaign.serviceArea ?? profile?.serviceArea ?? "Not specified"}

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
- platform-specific operator notes
- creative templates where relevant
- UTM guidance where relevant
- checks to complete before publishing

## Creative guidance
- Recommended image: ${brief?.creativeGuidance?.recommendedImage ?? "Not provided"}
- Avoid: ${brief?.creativeGuidance?.avoidImagery ?? "Not provided"}

## Important notes
- If a folder says “No approved asset found,” that platform was not approved for launch.
- Launch only the assets included in this pack.
- Do not invent extra copy unless the client explicitly requests changes.
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
    buildBudgetRecommendationMarkdown(
      campaign.assets
        .filter((asset) => asset.isApproved)
        .map((asset) => asset.assetType)
    )
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
    googleBusiness
      ? `${googleBusiness.title}\n\n${googleBusiness.description}\n\nCTA: ${googleBusiness.cta}`
      : "No approved Google Business asset found."
  );
  googleBusinessFolder?.file(
    "operator-notes.md",
    `# Google Business Profile Operator Notes

Use this folder to create and publish a Google Business Profile post.

Step-by-step
1. Open the client's Google Business Profile
2. Navigate to Posts or Updates
3. Choose the most relevant post type
4. Paste the copy from post-copy.txt
5. Upload a square creative image
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
  facebookFolder?.file(
    "operator-notes.md",
    `# Facebook Operator Notes

Use this folder for Facebook posting or ad setup.

Step-by-step
1. Open Facebook Business Manager or the Facebook Page
2. Create the post or ad
3. Paste the copy from facebook-copy.txt
4. Upload the correct image or creative
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
  instagramFolder?.file(
    "operator-notes.md",
    `# Instagram Operator Notes

Use this folder for Instagram feed, story, or reel setup.

Step-by-step
1. Open Instagram scheduling or Meta Business Suite
2. Choose Feed, Story, or Reel placement
3. Paste the copy from instagram-caption.txt
4. Upload the correct creative size
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
  googleAdsFolder?.file(
    "operator-notes.md",
    `# Google Ads Operator Notes

Use this folder to load the approved search ad copy into Google Ads.

Step-by-step
1. Open the correct Google Ads account
2. Create a new Search campaign or open the intended ad group
3. Copy the approved headlines and descriptions from search-assets.txt
4. Paste the copy into the responsive search ad fields
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

Step-by-step
1. Open the business Yelp account
2. Navigate to the correct ad or business content section
3. Paste the approved copy from yelp-ad-copy.txt
4. Add the correct CTA or booking link
5. Confirm service area language matches the Yelp profile
6. Confirm the phone number is correct
7. Preview the content
8. Publish or schedule

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
  blogFolder?.file(
    "blog-article.md",
    buildBlogArticleMarkdown(blog)
  );
  blogFolder?.file(
    "operator-notes.md",
    `# Blog Operator Notes

Use this folder to publish the approved blog article on the client's website.

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
"${campaign.targetService ?? "Service"} in ${campaign.serviceArea ?? "Your Area"} | ${profile?.businessName ?? "Local Experts"}"

H1
"${campaign.targetService ?? "Service"} in ${campaign.serviceArea ?? "Your Area"}"

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
- [ ] Correct format selected
- [ ] Copy pasted from facebook-copy.txt
- [ ] CTA checked
- [ ] Destination URL / phone checked

## Instagram
- [ ] Correct format selected
- [ ] Caption pasted from instagram-caption.txt
- [ ] Visual exported from correct template
- [ ] Text placement checked for crop safety

## Google Ads
- [ ] Headlines loaded
- [ ] Descriptions loaded
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