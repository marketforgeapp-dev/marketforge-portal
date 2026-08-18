import type { ReactNode } from "react";

import { PublicSiteShell } from "@/components/public-site/public-site-shell";

type KnowledgeArticleShellProps = {
  children: ReactNode;
};

export function KnowledgeArticleShell({
  children,
}: KnowledgeArticleShellProps) {
  return (
    <PublicSiteShell>
      <article className="px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-3xl">
          {children}
        </div>
      </article>
    </PublicSiteShell>
  );
}