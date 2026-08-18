import Link from "next/link";

import type { KnowledgeArticle } from "@/lib/public-site/knowledge";

type KnowledgeArticleHeaderProps = {
  article: KnowledgeArticle;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function KnowledgeArticleHeader({
  article,
}: KnowledgeArticleHeaderProps) {
  return (
    <header>
      <nav
        aria-label="Breadcrumb"
        className="text-sm text-white/50"
      >
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link
              href="/"
              className="transition hover:text-white"
            >
              Home
            </Link>
          </li>

          <li aria-hidden="true">/</li>

          <li>
            <Link
              href="/knowledge"
              className="transition hover:text-white"
            >
              Knowledge
            </Link>
          </li>

          <li aria-hidden="true">/</li>

          <li className="text-white/70">
            {article.pillar}
          </li>
        </ol>
      </nav>

      <div className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/85">
        {article.pillar}
      </div>

      <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
        {article.question}
      </h1>

      <p className="mt-5 text-base leading-7 text-white/65 sm:text-lg sm:leading-8">
        {article.description}
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-white/10 pb-8 text-sm text-white/48">
        <span>
          By {article.author.name}, {article.author.role}
        </span>

        <span aria-hidden="true">•</span>

        <span>
          Published {formatDate(article.publishedAt)}
        </span>

        {article.reviewedAt && (
          <>
            <span aria-hidden="true">•</span>

            <span>
              Reviewed {formatDate(article.reviewedAt)}
            </span>
          </>
        )}
      </div>
    </header>
  );
}