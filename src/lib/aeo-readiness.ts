type AeoReadinessInput = {
  hasServicePages?: boolean | null;
  hasFaqContent?: boolean | null;
  hasBlog?: boolean | null;
  hasGoogleBusinessPage?: boolean | null;
  servicePageUrls?: string[] | null;
  googleBusinessProfileUrl?: string | null;
};

export function calculateAeoReadinessScore(input: AeoReadinessInput): number {
  let score = 0;

  const servicePageCount = Array.isArray(input.servicePageUrls)
    ? input.servicePageUrls.filter((url) => typeof url === "string" && url.trim().length > 0)
        .length
    : 0;

  if (input.hasServicePages) {
    score += 25;
  }

  if (servicePageCount >= 1) {
    score += 10;
  }

  if (servicePageCount >= 4) {
    score += 10;
  }

  if (input.hasFaqContent) {
    score += 25;
  }

  if (input.hasBlog) {
    score += 10;
  }

  if (input.hasGoogleBusinessPage) {
    score += 10;
  }

  if (typeof input.googleBusinessProfileUrl === "string" && input.googleBusinessProfileUrl.trim().length > 0) {
    score += 10;
  }

  return Math.max(0, Math.min(100, score));
}