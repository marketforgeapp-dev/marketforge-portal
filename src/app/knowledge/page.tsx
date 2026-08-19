import type { Metadata } from "next";
import Link from "next/link";

import { PublicEyebrow } from "@/components/public-site/public-eyebrow";
import { PublicSection } from "@/components/public-site/public-section";
import { PublicSiteShell } from "@/components/public-site/public-site-shell";
import { getPublishedKnowledgeArticles } from "@/content/knowledge";
import {
  KNOWLEDGE_PILLAR_ORDER,
  type KnowledgePillar,
} from "@/lib/public-site/knowledge";
import { buildPublicMetadata } from "@/lib/public-site/metadata";

export const metadata: Metadata = buildPublicMetadata({
  title: "Knowledge",
  description:
  "Clear answers to durable questions about growth opportunities, recommendations, execution, competitors, measurement, growth execution, and continuous growth decision-making.",
  path: "/knowledge",
});

export default function KnowledgePage() {
  const articles = getPublishedKnowledgeArticles();

  const groupedArticles = KNOWLEDGE_PILLAR_ORDER.map(
    (pillar) => ({
      pillar,
      articles: articles.filter(
        (article) => article.pillar === pillar,
      ),
    }),
  ).filter(
    (
      group,
    ): group is {
      pillar: KnowledgePillar;
      articles: typeof articles;
    } => group.articles.length > 0,
  );

  return (
    <PublicSiteShell>
      <PublicSection contentClassName="max-w-5xl">
        <PublicEyebrow>MarketForge Knowledge</PublicEyebrow>

        <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
          What do you want to understand about business growth?
        </h1>

        <p className="mt-6 max-w-3xl text-base leading-7 text-white/68 sm:text-lg sm:leading-8">
          MarketForge Knowledge answers durable business questions
          about choosing growth opportunities, turning decisions into
          execution, measuring outcomes, and deciding what should
          happen next.
        </p>
      </PublicSection>

      <PublicSection
        className="border-t border-white/10 bg-white/[0.02]"
        contentClassName="max-w-5xl"
      >
        <div className="space-y-12">
          {groupedArticles.map((group) => (
            <section
              key={group.pillar}
              aria-labelledby={`pillar-${group.pillar
                .toLowerCase()
                .replaceAll(" ", "-")}`}
            >
              <h2
                id={`pillar-${group.pillar
                  .toLowerCase()
                  .replaceAll(" ", "-")}`}
                className="text-2xl font-semibold tracking-tight text-white"
              >
                {group.pillar}
              </h2>

              <div className="mt-5 grid gap-4">
                {group.articles.map((article) => (
                  <Link
                    key={article.slug}
                    href={`/knowledge/${article.slug}`}
                    className="group rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition hover:border-cyan-300/25 hover:bg-white/[0.055] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 sm:p-6"
                  >
                    <div className="flex items-start justify-between gap-6">
                      <div>
                        <h3 className="text-lg font-semibold leading-7 text-white/90 group-hover:text-white">
                          {article.question}
                        </h3>

                        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/58">
                          {article.description}
                        </p>
                      </div>

                      <span
                        aria-hidden="true"
                        className="mt-1 shrink-0 text-lg text-cyan-300 transition-transform group-hover:translate-x-1"
                      >
                        →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </PublicSection>
    </PublicSiteShell>
  );
}