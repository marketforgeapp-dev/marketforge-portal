import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/public-site/json-ld";
import { PrincipleCard } from "@/components/public-site/principle-card";
import { PublicPageHero } from "@/components/public-site/public-page-hero";
import { PublicSection } from "@/components/public-site/public-section";
import { PublicSiteShell } from "@/components/public-site/public-site-shell";
import { buildPublicMetadata } from "@/lib/public-site/metadata";
import { buildWebPageSchema } from "@/lib/public-site/structured-data";
import { MARKETFORGE_TERMINOLOGY } from "@/lib/public-site/terminology";

const title = "Growth Execution Platform";
const description =
  "MarketForge is a Growth Execution Platform that connects business context, growth opportunities, recommendations, business choice, execution, outcomes, and the next decision.";

export const metadata: Metadata = buildPublicMetadata({
  title,
  description,
  path: "/growth-execution-platform",
});

const operatingQuestions = [
  {
    number: "01",
    title: "What is happening in the business?",
    body: "Current economics, capacity, priorities, market conditions, competitors, reputation, and recent results create the context for the next decision.",
  },
  {
    number: "02",
    title: "What opportunities are worth considering?",
    body: "The system identifies business situations where action could create a meaningful outcome under current conditions.",
  },
  {
    number: "03",
    title: "What deserves attention first?",
    body: "Worthwhile possibilities are prioritized so the business does not have to treat every idea as equally important.",
  },
  {
    number: "04",
    title: "What should the business choose?",
    body: "The strongest recommendation creates focus while the business keeps final judgment and meaningful alternatives.",
  },
  {
    number: "05",
    title: "How does the choice become execution?",
    body: "The chosen opportunity or objective must turn into real, visible work instead of stopping at a recommendation.",
  },
  {
    number: "06",
    title: "What happened, and what should happen next?",
    body: "Business outcomes become additional context for the next recommendation without creating false certainty.",
  },
];

export default function RevenueOperatingSystemPage() {
  return (
    <PublicSiteShell>
      <JsonLd
        data={buildWebPageSchema({
          name: title,
          description,
          path: "/growth-execution-platform",
        })}
      />

      <PublicPageHero
        eyebrow="Growth Execution Platform"
        title="Growth needs an operating function, not another disconnected activity."
        description={
          <>
            <p className="font-medium text-white/88">
              {MARKETFORGE_TERMINOLOGY.growthExecutionPlatformDescription}
            </p>

            <p className="mt-4">
              Growth is not one channel, one tactic, one recommendation, or one
              report. It is a continuing business process, and MarketForge is built
              to help keep that process moving.
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
            The six questions
          </div>

          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            MarketForge keeps the growth process connected by repeatedly answering
            the questions growth creates.
          </h2>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {operatingQuestions.map((item) => (
            <PrincipleCard
              key={item.number}
              eyebrow={item.number}
              title={item.title}
            >
              {item.body}
            </PrincipleCard>
          ))}
        </div>
      </PublicSection>

      <PublicSection contentClassName="max-w-5xl">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            The opportunity comes before the execution.
          </h2>

          <p className="mt-5 text-base leading-7 text-white/68 sm:text-lg sm:leading-8">
            An activity-first approach starts with what to run. MarketForge starts
            with what is worth pursuing and lets the business objective determine
            the execution method.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/40">
              Activity-first
            </div>

            <div className="mt-5 space-y-3 text-sm leading-6 text-white/60">
              <p>Choose the channel.</p>
              <p>Decide what to run.</p>
              <p>Fit the objective around the activity.</p>
            </div>
          </div>

          <div className="rounded-3xl border border-cyan-300/20 bg-cyan-300/[0.055] p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300/80">
              Opportunity-first
            </div>

            <div className="mt-5 space-y-3 text-sm leading-6 text-white/78">
              <p>Identify what is worth pursuing.</p>
              <p>Choose what deserves attention.</p>
              <p>Fit execution to the objective.</p>
            </div>
          </div>
        </div>

        <div className="mt-7 text-lg font-medium leading-8 text-white/88">
          {MARKETFORGE_TERMINOLOGY.opportunityDoctrine}
        </div>
      </PublicSection>

      <PublicSection
        className="border-y border-white/10 bg-white/[0.02]"
        contentClassName="max-w-5xl"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <PrincipleCard title="Recommendation creates focus">
            The system should make the strongest current recommendation clear
            rather than leaving the business with an undifferentiated list of
            possibilities.
          </PrincipleCard>

          <PrincipleCard title="Choice stays with the business">
            A recommendation should support business judgment, not pretend the
            system knows every piece of context the owner knows.
          </PrincipleCard>

          <PrincipleCard title="Execution completes the decision">
            The recommendation only becomes useful when the chosen direction
            turns into work that can actually be reviewed, approved, and
            executed.
          </PrincipleCard>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.035] p-6">
          <p className="text-lg font-medium leading-8 text-white/90">
            {MARKETFORGE_TERMINOLOGY.recommendationDoctrine}
          </p>
        </div>
      </PublicSection>

      <PublicSection contentClassName="max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Outcomes keep the growth function continuous.
          </h2>

          <p className="mt-5 text-base leading-7 text-white/68 sm:text-lg sm:leading-8">
            Leads, booked jobs, booked revenue, and other relevant business
            outcomes should add context to future decisions. They are evidence
            about what happened, not automatic instructions to repeat the same
            action forever.
          </p>
        </div>

        {/* Desktop operating loop */}
        <div className="relative py-1">
          {/* Forward path */}
          <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-[#0d1620] px-5 py-5 shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
              <div className="text-xs font-semibold text-cyan-300/70">
                01
              </div>
              <div className="mt-2 text-sm font-semibold text-white/90">
                Business context
              </div>
            </div>

            <div aria-hidden="true" className="text-2xl text-cyan-300/65">
              →
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0d1620] px-5 py-5 shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
              <div className="text-xs font-semibold text-cyan-300/70">
                02
              </div>
              <div className="mt-2 text-sm font-semibold text-white/90">
                Opportunity
              </div>
            </div>

            <div aria-hidden="true" className="text-2xl text-cyan-300/65">
              →
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0d1620] px-5 py-5 shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
              <div className="text-xs font-semibold text-cyan-300/70">
                03
              </div>
              <div className="mt-2 text-sm font-semibold text-white/90">
                Recommendation
              </div>
            </div>

            <div aria-hidden="true" className="text-2xl text-cyan-300/65">
              →
            </div>

            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.055] px-5 py-5 shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
              <div className="text-xs font-semibold text-cyan-300/70">
                04
              </div>
              <div className="mt-2 text-sm font-semibold text-white/90">
                Choice
              </div>
            </div>
          </div>

          {/* Downward turn */}
          {/* Choice -> Execution */}
          <div className="flex justify-end pr-[9%]">
            <div
              aria-hidden="true"
              className="flex h-20 items-center justify-center text-3xl text-cyan-300/70"
            >
              ↓
            </div>
          </div>

          {/* Return path */}
          <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-3">
            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.055] px-5 py-5 shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
              <div className="text-xs font-semibold text-cyan-300/70">
                07
              </div>
              <div className="mt-2 text-sm font-semibold text-white/90">
                Updated context
              </div>
            </div>

            <div aria-hidden="true" className="text-2xl text-cyan-300/65">
              ←
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0d1620] px-5 py-5 shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
              <div className="text-xs font-semibold text-cyan-300/70">
                06
              </div>
              <div className="mt-2 text-sm font-semibold text-white/90">
                Outcome
              </div>
            </div>

            <div aria-hidden="true" className="text-2xl text-cyan-300/65">
              ←
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0d1620] px-5 py-5 shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
              <div className="text-xs font-semibold text-cyan-300/70">
                05
              </div>
              <div className="mt-2 text-sm font-semibold text-white/90">
                Execution
              </div>
            </div>
          </div>
          {/* Updated context -> Business context */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-[7.7%] top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center text-3xl text-cyan-300/70"
          >
            ↑
          </div>
        </div>

        {/* Feedback path */}
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
                Outcomes and updated business conditions become the context for the
                next decision. That keeps the growth process current instead of
                treating each action as an isolated event.
              </p>
            </div>
          </div>
        </div>

        {/* Mobile operating loop */}
        <div className="relative mx-auto mt-10 max-w-md md:hidden">
          <div className="absolute bottom-8 left-[21px] top-8 w-px bg-gradient-to-b from-cyan-300/60 via-cyan-300/20 to-cyan-300/60" />

          <div className="space-y-3">
            {[
              "Business context",
              "Opportunity",
              "Recommendation",
              "Choice",
              "Execution",
              "Outcome",
              "Updated context",
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
            <span>Updated context begins the next cycle</span>
            <span aria-hidden="true">↻</span>
          </div>
        </div>
      </PublicSection>

      <PublicSection
        className="border-y border-white/10 bg-white/[0.02]"
        contentClassName="max-w-5xl"
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-8">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
              Knowledge answer
            </div>

            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
              What is a Growth Execution Platform?
            </h2>

            <p className="mt-4 text-sm leading-6 text-white/62">
              Read how MarketForge uses the term and how the platform helps
              operationalize a continuous growth function.
            </p>

            <Link
              href="/knowledge/what-is-a-growth-execution-platform"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
            >
              Read the focused answer
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-8">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
              Product behavior
            </div>

            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
              See how MarketForge applies the operating model.
            </h2>

            <p className="mt-4 text-sm leading-6 text-white/62">
              The product uses the same recommendation, choice, execution, and
              outcome logic described here.
            </p>

            <Link
              href="/how-marketforge-works"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
            >
              How MarketForge Works
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </PublicSection>
    </PublicSiteShell>
  );
}