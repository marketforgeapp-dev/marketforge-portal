import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/public-site/json-ld";
import { KnowledgeArticleHeader } from "@/components/public-site/knowledge/knowledge-article-header";
import { KnowledgeArticleShell } from "@/components/public-site/knowledge/knowledge-article-shell";
import { RelatedQuestions } from "@/components/public-site/knowledge/related-questions";
import {
  getKnowledgeArticleBySlug,
  getPublishedKnowledgeArticles,
  getRelatedKnowledgeArticles,
} from "@/content/knowledge";
import { buildPublicMetadata } from "@/lib/public-site/metadata";
import {
  buildBreadcrumbSchema,
  FOUNDER_SCHEMA_ID,
  ORGANIZATION_SCHEMA_ID,
  WEBSITE_SCHEMA_ID,
} from "@/lib/public-site/structured-data";
import { absolutePublicUrl } from "@/lib/public-site/site-config";

type KnowledgeArticlePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return getPublishedKnowledgeArticles().map((article) => ({
    slug: article.slug,
  }));
}

export async function generateMetadata({
  params,
}: KnowledgeArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getKnowledgeArticleBySlug(slug);

  if (!article) {
    return {};
  }

  return buildPublicMetadata({
    title: article.title,
    description: article.description,
    path: `/knowledge/${article.slug}`,
    type: "article",
  });
}

export default async function KnowledgeArticlePage({
  params,
}: KnowledgeArticlePageProps) {
  const { slug } = await params;
  const article = getKnowledgeArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const RelatedArticles = getRelatedKnowledgeArticles(article);
  const ArticleComponent = article.component;

  const url = absolutePublicUrl(
    `/knowledge/${article.slug}`,
  );

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#article`,
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    dateModified:
      article.reviewedAt ?? article.publishedAt,
    mainEntityOfPage: {
      "@id": `${url}#webpage`,
    },
    author: {
      "@id": FOUNDER_SCHEMA_ID,
    },
    publisher: {
      "@id": ORGANIZATION_SCHEMA_ID,
    },
    isPartOf: {
      "@id": WEBSITE_SCHEMA_ID,
    },
  };

  const webpageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: article.title,
    description: article.description,
    isPartOf: {
      "@id": WEBSITE_SCHEMA_ID,
    },
    mainEntity: {
      "@id": `${url}#article`,
    },
  };

  const breadcrumbSchema = buildBreadcrumbSchema([
    {
      name: "Home",
      path: "/",
    },
    {
      name: "Knowledge",
      path: "/knowledge",
    },
    {
      name: article.title,
      path: `/knowledge/${article.slug}`,
    },
  ]);

  return (
    <KnowledgeArticleShell>
      <JsonLd
        data={[
          webpageSchema,
          articleSchema,
          breadcrumbSchema,
        ]}
      />

      <KnowledgeArticleHeader article={article} />

      <ArticleComponent />

      <RelatedQuestions articles={RelatedArticles} />
    </KnowledgeArticleShell>
  );
}