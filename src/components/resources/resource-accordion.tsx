"use client";

import { useState } from "react";
import { MarkdownDocument } from "@/components/resources/markdown-document";

type ResourceItem = {
  slug: string;
  title: string;
  summary: string;
  markdown: string;
};

type ResourceAccordionProps = {
  resources: ResourceItem[];
};

export function ResourceAccordion({
  resources,
}: ResourceAccordionProps) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  return (
    <section className="space-y-4">
      {resources.map((resource) => {
        const isOpen = openSlug === resource.slug;

        return (
          <div
            key={resource.slug}
            className="mf-card overflow-hidden rounded-3xl"
          >
            <div className="flex items-start justify-between gap-4 p-5 md:p-6">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#3B5CCC]">
                  Customer Resource
                </p>

                <h2 className="mt-2 text-xl font-semibold tracking-tight text-gray-950 md:text-2xl">
                  {resource.title}
                </h2>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                  {resource.summary}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setOpenSlug(isOpen ? null : resource.slug)
                }
                className="shrink-0 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-600 transition hover:bg-gray-100"
              >
                {isOpen ? "Close" : "Expand"}
              </button>
            </div>

            {isOpen ? (
              <div className="border-t border-gray-200 px-5 py-5 md:px-6 md:py-6">
                <div
                  className="
                    prose max-w-none prose-gray
                    prose-headings:text-gray-950
                    prose-headings:tracking-tight
                    prose-p:text-gray-700
                    prose-strong:text-gray-950
                    prose-li:text-gray-700
                    prose-a:text-[#3B5CCC]
                    prose-blockquote:text-gray-700
                    prose-code:text-[#B7791F]
                    prose-pre:bg-gray-950 prose-pre:text-white
                  "
                >
                  <MarkdownDocument markdown={resource.markdown} />
                </div>
              </div>
            ) : null}
          </div>
        );
      })}

      {resources.length === 0 ? (
        <section className="mf-card rounded-3xl p-6">
          <p className="text-sm leading-6 text-gray-600">
            No customer resources are currently available.
          </p>
        </section>
      ) : null}
    </section>
  );
}