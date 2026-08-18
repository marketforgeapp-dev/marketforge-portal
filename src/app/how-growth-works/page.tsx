import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/public-site/json-ld";
import { PrincipleCard } from "@/components/public-site/principle-card";
import { PublicPageHero } from "@/components/public-site/public-page-hero";
import { PublicSection } from "@/components/public-site/public-section";
import { PublicSiteShell } from "@/components/public-site/public-site-shell";
import { buildPublicMetadata } from "@/lib/public-site/metadata";
import { buildWebPageSchema } from "@/lib/public-site/structured-data";

const title = "How Growth Works";
const description =
  "Growth should stay intentional even when the business gets busy. The objective may change, but the responsibility to manage growth does not.";

export const metadata: Metadata = buildPublicMetadata({
  title,
  description,
  path: "/how-growth-works",
});

export default function HowGrowthWorksPage() {
  return (
    <PublicSiteShell>
      <JsonLd
        data={buildWebPageSchema({
          name: title,
          description,
          path: "/how-growth-works",
        })}
      />

      <PublicPageHero
        eyebrow="How Growth Works"
        title="Growth should stay intentional, even when the business gets busy."
        description={
          <>
            <p>
              Growth is not something a business should switch on only when
              work slows down. What changes over time is the objective, not the
              responsibility to manage growth deliberately.
            </p>

            <p className="mt-4 font-medium text-white/88">
              The goal is not always more demand. The goal is making the right
              growth decision for the conditions of the business.
            </p>
          </>
        }
      />

      <PublicSection
        className="border-y border-white/10 bg-white/[0.02]"
        contentClassName="max-w-5xl"
      >
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
            The responsibility remains
          </div>

          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            The business changes. Growth has to change with it.
          </h2>

          <p className="mt-5 text-base leading-7 text-white/68 sm:text-lg sm:leading-8">
            Capacity, seasonality, demand, priorities, reputation, competitors,
            and recent results all change the context surrounding a growth
            decision. Treating growth as a fixed set of activities ignores that
            reality.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <PrincipleCard title="When capacity is available">
            The business may benefit from creating additional demand or
            pursuing services with room to grow.
          </PrincipleCard>

          <PrincipleCard title="When the business is busy">
            The objective may shift toward better-fit work, higher-value work,
            retention, reputation, or future demand rather than simply adding
            more jobs.
          </PrincipleCard>

          <PrincipleCard title="When conditions change">
            The right growth objective should be reconsidered instead of
            continuing yesterday&apos;s plan by default.
          </PrincipleCard>
        </div>
      </PublicSection>

      <PublicSection contentClassName="max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
            A continuous responsibility
          </div>

          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Growth is a cycle, not a one-time plan.
          </h2>

          <p className="mt-5 text-base leading-7 text-white/68 sm:text-lg sm:leading-8">
            The result of one decision becomes context for the next. That is why
            growth needs an operating process rather than a collection of
            disconnected activities.
          </p>
        </div>

        {/* Desktop cycle */}
        <div className="mx-auto mt-12 hidden max-w-6xl md:block">
          <div className="relative py-1">
            {/* Forward path */}
            <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-3">
              <div className="rounded-2xl border border-white/10 bg-[#0d1620] px-5 py-5 shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
                <div className="text-xs font-semibold text-cyan-300/70">
                  01
                </div>

                <div className="mt-2 text-sm font-semibold text-white/90">
                  Understand
                </div>
              </div>

              <div
                aria-hidden="true"
                className="text-2xl text-cyan-300/65"
              >
                →
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0d1620] px-5 py-5 shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
                <div className="text-xs font-semibold text-cyan-300/70">
                  02
                </div>

                <div className="mt-2 text-sm font-semibold text-white/90">
                  Identify
                </div>
              </div>

              <div
                aria-hidden="true"
                className="text-2xl text-cyan-300/65"
              >
                →
              </div>

              <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.055] px-5 py-5 shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
                <div className="text-xs font-semibold text-cyan-300/70">
                  03
                </div>

                <div className="mt-2 text-sm font-semibold text-white/90">
                  Choose
                </div>
              </div>
            </div>

            {/* Choose -> Execute */}
            <div className="flex justify-end pr-[15%]">
              <div
                aria-hidden="true"
                className="flex h-20 items-center justify-center text-3xl text-cyan-300/70"
              >
                ↓
              </div>
            </div>

            {/* Return path */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.055] px-5 py-5 shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
                <div className="text-xs font-semibold text-cyan-300/70">
                  05
                </div>

                <div className="mt-2 text-sm font-semibold text-white/90">
                  Measure
                </div>
              </div>

              <div
                aria-hidden="true"
                className="text-2xl text-cyan-300/65"
              >
                ←
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0d1620] px-5 py-5 shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
                <div className="text-xs font-semibold text-cyan-300/70">
                  04
                </div>

                <div className="mt-2 text-sm font-semibold text-white/90">
                  Execute
                </div>
              </div>
            </div>

            {/* Measure -> Understand */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-[14.5%] top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center text-3xl text-cyan-300/70"
            >
              ↑
            </div>
          </div>

          {/* Feedback explanation */}
          <div className="mt-8 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.04] px-6 py-5">
            <div className="flex items-start gap-4">
              <div
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-3xl text-cyan-300/75"
              >
                ↻
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
                  The information loop closes
                </div>

                <p className="mt-2 max-w-4xl text-sm leading-6 text-white/65">
                  What the business measures becomes additional context for
                  understanding what deserves attention next. As business conditions
                  change, that updated context keeps the next growth decision grounded
                  in what is happening now.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile cycle */}
        <div className="relative mx-auto mt-10 max-w-md md:hidden">
          <div className="absolute bottom-8 left-[21px] top-8 w-px bg-gradient-to-b from-cyan-300/60 via-cyan-300/20 to-cyan-300/60" />

          <div className="space-y-3">
            {[
              "Understand",
              "Identify",
              "Choose",
              "Execute",
              "Measure",
            ].map((step, index) => (
              <div
                key={step}
                className="relative flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-4"
              >
                <div className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-cyan-300/25 bg-[#0d1620] text-xs font-semibold text-cyan-300">
                  {String(index + 1).padStart(2, "0")}
                </div>

                <div className="text-sm font-semibold text-white/88">
                  {step}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300/65">
            <span>Measure informs Understand</span>
            <span aria-hidden="true">↻</span>
          </div>
        </div>
      </PublicSection>

      <PublicSection
        className="border-y border-white/10 bg-white/[0.02]"
        contentClassName="max-w-5xl"
      >
        <div className="max-w-3xl">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Busy does not mean growth is finished.
          </h2>

          <p className="mt-5 text-base leading-7 text-white/68 sm:text-lg sm:leading-8">
            A full schedule can change what the business should pursue, but it
            does not eliminate the need to think about what comes next.
            Intentional growth protects the business from waiting until demand
            has already slowed before deciding how to respond.
          </p>

          <div className="mt-7 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.06] p-5 sm:p-6">
            <p className="text-lg font-medium leading-8 text-white/90">
              Growth should be managed intentionally all the time. What changes
              is the objective, not the responsibility.
            </p>
          </div>
        </div>
      </PublicSection>

      <PublicSection contentClassName="max-w-5xl">
        <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-8">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
            The operating question
          </div>

          <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-white">
            If growth is continuous, someone has to keep the process moving.
          </h2>

          <p className="mt-5 max-w-3xl text-base leading-7 text-white/68">
            That responsibility is what leads to the idea of a Revenue
            Operating System: a business function connecting opportunity,
            recommendation, execution, outcomes, and the next decision.
          </p>

          <Link
            href="/revenue-operating-system"
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 transition hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            Understand the Revenue Operating System
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </PublicSection>
    </PublicSiteShell>
  );
}