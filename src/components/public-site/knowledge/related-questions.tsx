import Link from "next/link";

import type { KnowledgeArticle } from "@/lib/public-site/knowledge";

type RelatedQuestionsProps = {
  articles: KnowledgeArticle[];
};

export function RelatedQuestions({
  articles,
}: RelatedQuestionsProps) {
  if (articles.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="related-questions-heading"
      className="mt-14 border-t border-white/10 pt-10"
    >
      <h2
        id="related-questions-heading"
        className="text-2xl font-semibold tracking-tight text-white"
      >
        Related questions
      </h2>

      <div className="mt-5 grid gap-3">
        {articles.map((article) => (
          <Link
            key={article.slug}
            href={`/knowledge/${article.slug}`}
            className="group rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 transition hover:border-cyan-300/25 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="text-sm font-semibold leading-6 text-white/82 group-hover:text-white">
                {article.question}
              </span>

              <span
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-cyan-300 transition-transform group-hover:translate-x-1"
              >
                →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}