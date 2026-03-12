type ExtractedLink = {
  href: string;
  text: string;
};

export type WebsitePrefillContext = {
  normalizedWebsite: string;
  title: string | null;
  metaDescription: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  logoCandidates: string[];
  internalLinks: ExtractedLink[];
  visibleTextExcerpt: string;
  fetchedPages: Array<{
    url: string;
    title: string | null;
    visibleTextExcerpt: string;
  }>;
};

function normalizeWebsite(input: string): string | null {
  const trimmed = input.trim();

  if (!trimmed) return null;

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function cleanWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function stripHtml(html: string): string {
  return cleanWhitespace(
    decodeHtmlEntities(
      html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
        .replace(/<\/(p|div|section|article|li|h1|h2|h3|h4|h5|h6|br|footer|address)>/gi, "\n")
        .replace(/<[^>]+>/g, " ")
    )
  );
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}...`;
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? cleanWhitespace(decodeHtmlEntities(match[1])) : null;
}

function extractMetaDescription(html: string): string | null {
  const match = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i
  );

  if (match) {
    return cleanWhitespace(decodeHtmlEntities(match[1]));
  }

  const altMatch = html.match(
    /<meta[^>]+content=["']([\s\S]*?)["'][^>]+name=["']description["'][^>]*>/i
  );

  return altMatch ? cleanWhitespace(decodeHtmlEntities(altMatch[1])) : null;
}

function absolutizeUrl(href: string, baseUrl: string): string | null {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

function extractLinks(html: string, baseUrl: string): ExtractedLink[] {
  const matches = [
    ...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi),
  ];

  const links: ExtractedLink[] = [];

  for (const match of matches) {
    const href = match[1];
    const text = cleanWhitespace(stripHtml(match[2] || ""));

    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
      continue;
    }

    const absolute = absolutizeUrl(href, baseUrl);

    if (!absolute) continue;

    try {
      const base = new URL(baseUrl);
      const target = new URL(absolute);

      if (base.hostname !== target.hostname) continue;
    } catch {
      continue;
    }

    links.push({
      href: absolute,
      text,
    });
  }

  const seen = new Set<string>();
  return links.filter((link) => {
    if (seen.has(link.href)) return false;
    seen.add(link.href);
    return true;
  });
}

function extractLogoCandidates(html: string, baseUrl: string): string[] {
  const srcCandidates = [
    ...html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi),
    ...html.matchAll(/<img[^>]+data-src=["']([^"']+)["'][^>]*>/gi),
  ];

  const results: string[] = [];

  for (const match of srcCandidates) {
    const raw = match[1] ?? "";
    const lower = raw.toLowerCase();

    if (!lower) continue;
    if (
      lower.includes("logo") ||
      lower.includes("brand") ||
      lower.includes("header")
    ) {
      const absolute = absolutizeUrl(raw, baseUrl);
      if (absolute) results.push(absolute);
    }
  }

  const favicon = absolutizeUrl("/favicon.ico", baseUrl);
  if (favicon) results.push(favicon);

  return Array.from(new Set(results));
}

function extractPhone(text: string): string | null {
  const match = text.match(
    /(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/
  );

  return match ? cleanWhitespace(match[0]) : null;
}

function extractEmail(text: string): string | null {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0] : null;
}

function extractAddress(text: string): string | null {
  const match = text.match(
    /\b\d{1,6}\s+[A-Za-z0-9.#'\- ]+,\s*[A-Za-z .'\-]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/
  );

  return match ? cleanWhitespace(match[0]) : null;
}

function extractCityState(text: string): { city: string | null; state: string | null } {
  const addressMatch = text.match(
    /\b\d{1,6}\s+[A-Za-z0-9.#'\- ]+,\s*([A-Za-z .'\-]+),\s*([A-Z]{2})\s+\d{5}(?:-\d{4})?\b/
  );

  if (addressMatch) {
    return {
      city: cleanWhitespace(addressMatch[1]),
      state: cleanWhitespace(addressMatch[2]),
    };
  }

  const cityStateMatch = text.match(/\b([A-Z][A-Za-z .'\-]+),\s*([A-Z]{2})\b/);

  if (cityStateMatch) {
    return {
      city: cleanWhitespace(cityStateMatch[1]),
      state: cleanWhitespace(cityStateMatch[2]),
    };
  }

  return {
    city: null,
    state: null,
  };
}

function scoreLink(link: ExtractedLink): number {
  const combined = `${link.text} ${link.href}`.toLowerCase();

  let score = 0;

  if (combined.includes("service")) score += 4;
  if (combined.includes("about")) score += 3;
  if (combined.includes("contact")) score += 3;
  if (combined.includes("location")) score += 3;
  if (combined.includes("areas")) score += 3;
  if (combined.includes("service-area")) score += 4;
  if (combined.includes("plumb")) score += 2;
  if (combined.includes("drain")) score += 2;
  if (combined.includes("water heater")) score += 2;
  if (combined.includes("repair")) score += 2;
  if (combined.includes("faq")) score += 2;
  if (combined.includes("blog")) score += 1;

  return score;
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; MarketForgeOnboardingBot/1.0; +https://marketforge.local)",
      },
      redirect: "follow",
      cache: "no-store",
    });

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return null;

    return await response.text();
  } catch {
    return null;
  }
}

export async function getWebsitePrefillContext(
  websiteInput: string
): Promise<WebsitePrefillContext | null> {
  const normalizedWebsite = normalizeWebsite(websiteInput);

  if (!normalizedWebsite) return null;

  const homepageHtml = await fetchHtml(normalizedWebsite);
  if (!homepageHtml) return null;

  const title = extractTitle(homepageHtml);
  const metaDescription = extractMetaDescription(homepageHtml);
  const visibleText = stripHtml(homepageHtml);
  const internalLinks = extractLinks(homepageHtml, normalizedWebsite);
  const logoCandidates = extractLogoCandidates(homepageHtml, normalizedWebsite);
  const phone = extractPhone(visibleText);
  const email = extractEmail(visibleText);
  const address = extractAddress(visibleText);
  const cityState = extractCityState(`${visibleText}\n${address ?? ""}`);

  const topLinks = [...internalLinks]
    .sort((a, b) => scoreLink(b) - scoreLink(a))
    .slice(0, 4);

  const fetchedPages: WebsitePrefillContext["fetchedPages"] = [];
  let mergedExtraText = "";

  for (const link of topLinks) {
    const html = await fetchHtml(link.href);
    if (!html) continue;

    const pageText = truncate(stripHtml(html), 2500);
    mergedExtraText += ` ${pageText}`;

    fetchedPages.push({
      url: link.href,
      title: extractTitle(html),
      visibleTextExcerpt: pageText,
    });
  }

  const secondaryCityState = extractCityState(mergedExtraText);

  return {
    normalizedWebsite,
    title,
    metaDescription,
    phone,
    email,
    address,
    city: cityState.city ?? secondaryCityState.city,
    state: cityState.state ?? secondaryCityState.state,
    logoCandidates,
    internalLinks: internalLinks.slice(0, 12),
    visibleTextExcerpt: truncate(visibleText, 5000),
    fetchedPages,
  };
}