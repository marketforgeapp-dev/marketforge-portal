export function normalizeBusinessName(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(llc|l\.l\.c\.|inc|incorporated|corp|corporation|company|co)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeWebsite(value: string) {
  const trimmed = value.trim();

  const candidate = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  const url = new URL(candidate);

  url.hash = "";

  return url.toString();
}

export function getWebsiteDomain(value: string) {
  const normalized = normalizeWebsite(value);

  return new URL(normalized).hostname
    .toLowerCase()
    .replace(/^www\./, "");
}