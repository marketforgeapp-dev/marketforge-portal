import type { ReactNode } from "react";

type ArticleSectionProps = {
  title: string;
  children: ReactNode;
};

export function ArticleSection({
  title,
  children,
}: ArticleSectionProps) {
  return (
    <section className="mt-12">
      <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        {title}
      </h2>

      <div className="mt-4 space-y-5 text-base leading-7 text-white/72 sm:text-lg sm:leading-8">
        {children}
      </div>
    </section>
  );
}

type ArticleCalloutProps = {
  children: ReactNode;
};

export function ArticleCallout({
  children,
}: ArticleCalloutProps) {
  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-base font-medium leading-7 text-white/88 sm:p-6 sm:text-lg sm:leading-8">
      {children}
    </div>
  );
}

type ArticleTakeawayProps = {
  children: ReactNode;
};

export function ArticleTakeaway({
  children,
}: ArticleTakeawayProps) {
  return (
    <section className="mt-12 rounded-3xl border border-cyan-300/20 bg-gradient-to-br from-cyan-300/[0.08] via-blue-400/[0.04] to-transparent p-6 sm:p-8">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
        Practical takeaway
      </div>

      <div className="mt-3 text-lg font-medium leading-8 text-white/90">
        {children}
      </div>
    </section>
  );
}