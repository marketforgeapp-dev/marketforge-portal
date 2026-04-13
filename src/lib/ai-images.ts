import { put } from "@vercel/blob";
import { openai } from "@/lib/openai";

export type GeneratedCampaignImage = {
  url: string | null;
  prompt: string | null;
  status: "generated" | "failed" | "skipped";
  mimeType: string | null;
};

function sanitizeFilePart(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export function shouldGenerateAiImage(params: {
  assetType: string;
  imageMode?: "SERVICE_IMAGE" | "LOGO" | null;
  isReviewAction: boolean;
  isVisibilityAction: boolean;
}) {
  if (params.imageMode === "LOGO") return false;
  if (params.isReviewAction) return false;
  if (params.isVisibilityAction) return false;

  return (
    params.assetType === "GOOGLE_BUSINESS" ||
    params.assetType === "META" ||
    params.assetType === "GOOGLE_ADS"
  );
}

export function buildCampaignImagePrompt(params: {
  platform: "GOOGLE_BUSINESS" | "META" | "GOOGLE_ADS";
  businessName: string;
  serviceArea: string;
  targetService: string;
  actionTitle: string;
  actionSummary: string;
  audience: string;
  offer?: string | null;
  cta?: string | null;
}) {
    const platformStyle =
    params.platform === "GOOGLE_ADS"
      ? [
          "Create a clean, realistic paid-ad image for Google Ads.",
          "Service-focused, direct-response, uncluttered composition.",
          "Professional local home-service setting.",
        ].join(" ")
      : params.platform === "GOOGLE_BUSINESS"
        ? [
            "Create a realistic, trustworthy image for a Google Business Profile post.",
            "Clean, local, professional, and service-forward.",
            "Slightly less ad-like than paid social, but still polished and compelling.",
            "Professional local home-service setting.",
          ].join(" ")
        : [
            "Create a realistic, engaging paid-social image for Facebook and Instagram.",
            "Slightly warmer and more lifestyle-oriented than a search ad, but still grounded and believable.",
            "Professional local home-service setting.",
          ].join(" ");

  return [
    platformStyle,
    `Business: ${params.businessName}.`,
    `Service area: ${params.serviceArea}.`,
    `Target service: ${params.targetService}.`,
    `Action title: ${params.actionTitle}.`,
    `Action summary: ${params.actionSummary}.`,
    `Audience: ${params.audience}.`,
    `Offer: ${params.offer ?? "No explicit offer"}.`,
    `CTA: ${params.cta ?? "Book now"}.`,
    "Requirements:",
    "- Photorealistic.",
    "- Trustworthy and premium-looking, but not flashy.",
    "- Show a believable home-service moment relevant to the target service.",
    "- Business-name text is allowed only when it appears naturally on a service truck, shirt, storefront sign, yard sign, or equipment.",
    "- Do not add large promotional text blocks or headline overlays.",
    "- Do not invent a complex logo mark.",
    "- Keep any business-name text subtle, realistic, and secondary to the image.",
    "- No watermarks.",
    "- No collage layout.",
    "- No split-screen before/after.",
    "- No exaggerated facial expressions.",
    "- Must feel launch-ready for a real local service business ad.",
  ].join(" ");
}

export async function generateAndStoreCampaignImage(params: {
  campaignId: string;
  assetType: "GOOGLE_BUSINESS" | "META" | "GOOGLE_ADS";
  businessName: string;
  serviceArea: string;
  targetService: string;
  actionTitle: string;
  actionSummary: string;
  audience: string;
  offer?: string | null;
  cta?: string | null;
}) : Promise<GeneratedCampaignImage> {
  const prompt = buildCampaignImagePrompt({
    platform: params.assetType,
    businessName: params.businessName,
    serviceArea: params.serviceArea,
    targetService: params.targetService,
    actionTitle: params.actionTitle,
    actionSummary: params.actionSummary,
    audience: params.audience,
    offer: params.offer,
    cta: params.cta,
  });

  try {
    const result = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
    });

    const image = result.data?.[0];

    if (!image?.b64_json) {
      return {
        url: null,
        prompt,
        status: "failed",
        mimeType: null,
      };
    }

    const buffer = Buffer.from(image.b64_json, "base64");
    const pathname = [
      "campaign-assets",
      sanitizeFilePart(params.campaignId),
      `${sanitizeFilePart(params.assetType)}-${Date.now()}.png`,
    ].join("/");

    const blob = await put(pathname, buffer, {
      access: "public",
      contentType: "image/png",
      addRandomSuffix: false,
    });

    return {
      url: blob.url,
      prompt,
      status: "generated",
      mimeType: "image/png",
    };
  } catch (error) {
    console.error("[ai-image-generation] failed", {
      campaignId: params.campaignId,
      assetType: params.assetType,
      error,
    });

    return {
      url: null,
      prompt,
      status: "failed",
      mimeType: null,
    };
  }
}