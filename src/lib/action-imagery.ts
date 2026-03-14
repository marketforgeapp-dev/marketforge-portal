export type ActionImageMode = "SERVICE_IMAGE" | "LOGO";

const ACTION_IMAGE_MAP: Record<string, string> = {
  "drain-cleaning": "/images/actions/drain-cleaning.jpg",
  "water-heater-install": "/images/actions/water-heater-install.jpg",
  "tankless-water-heater-install": "/images/actions/tankless-water-heater-install.jpg",
  "emergency-plumbing": "/images/actions/emergency-plumbing.jpg",
  "service-checkup": "/images/actions/service-checkup.jpg",
  "leak-repair": "/images/actions/leak-repair.jpg",
  "toilet-repair": "/images/actions/toilet-repair.jpg",
  "sump-pump": "/images/actions/sump-pump.jpg",
  "general-plumbing": "/images/actions/general-plumbing.jpg",
  "company-logo": "/images/actions/company-logo-placeholder.png",
  fallback: "/images/actions/fallback-service.jpg",
};

export function getActionImage(params: {
  imageKey?: string | null;
  imageMode?: ActionImageMode | null;
  logoUrl?: string | null;
}) {
  const { imageKey, imageMode, logoUrl } = params;

  if (imageMode === "LOGO") {
    return {
      src: logoUrl || ACTION_IMAGE_MAP["company-logo"],
      alt: "Company logo",
    };
  }

  return {
    src:
      (imageKey ? ACTION_IMAGE_MAP[imageKey] : null) || ACTION_IMAGE_MAP.fallback,
    alt: imageKey ? imageKey.replace(/-/g, " ") : "Service action preview",
  };
}