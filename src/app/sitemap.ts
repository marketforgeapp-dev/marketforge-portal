import type { MetadataRoute } from "next";

import { getPublishedKnowledgeArticles } from "@/content/knowledge";
import { absolutePublicUrl } from "@/lib/public-site/site-config";

const corePublicRoutes = [
  "/",
  "/how-growth-works",
  "/growth-execution-platform",
  "/how-marketforge-works",
  "/why-marketforge",
  "/growth-strategy-session",
  "/knowledge",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const corePages = corePublicRoutes.map((path) => ({
    url: absolutePublicUrl(path),
    changeFrequency:
      path === "/" ? ("weekly" as const) : ("monthly" as const),
  }));

  const knowledgeArticles =
    getPublishedKnowledgeArticles().map((article) => ({
      url: absolutePublicUrl(
        `/knowledge/${article.slug}`,
      ),
      lastModified:
        article.reviewedAt ?? article.publishedAt,
      changeFrequency: "monthly" as const,
    }));

  return [
    ...corePages,
    ...knowledgeArticles,
  ];
}