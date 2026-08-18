import Image from "next/image";
import Link from "next/link";

import { PublicSiteShell } from "@/components/public-site/public-site-shell";

const growthResponsibilities = [
  {
    number: "01",
    title: "Understand the business",
    description:
      "Services, economics, capacity, priorities, reputation, seasonality, and local market conditions all affect what deserves attention.",
  },
  {
    number: "02",
    title: "Find the opportunity",
    description:
      "MarketForge evaluates the business and surfaces growth opportunities worth considering instead of starting with a channel or tactic.",
  },
  {
    number: "03",
    title: "Recommend what matters",
    description:
      "The strongest opportunities rise to the top while worthwhile alternatives remain visible for business judgment.",
  },
  {
    number: "04",
    title: "Turn the choice into action",
    description:
      "Once the business chooses what to pursue, MarketForge helps turn that decision into executable work.",
  },
  {
    number: "05",
    title: "Measure the result",
    description:
      "Leads, booked jobs, and booked revenue become additional context for what the business should consider next.",
  },
];

const lifecycleSteps = [
  {
    number: "01",
    title: "Find",
    description:
      "MarketForge continuously evaluates business context and identifies worthwhile growth opportunities.",
  },
  {
    number: "02",
    title: "Choose",
    description:
      "MarketForge recommends what deserves attention. The business decides what it wants to pursue.",
  },
  {
    number: "03",
    title: "Execute",
    description:
      "The chosen opportunity or owner-directed objective is turned into structured, executable work.",
  },
  {
    number: "04",
    title: "Measure",
    description:
      "Results stay visible in business terms so the next recommendation has better context.",
  },
];

const outcomeItems = [
  {
    title: "Leads",
    description:
      "See the customer opportunities connected to the work being executed.",
  },
  {
    title: "Booked jobs",
    description:
      "Track which opportunities actually turn into work for the business.",
  },
  {
    title: "Booked revenue",
    description:
      "Keep the economic result visible without pretending every outcome has perfect attribution.",
  },
];

export default function HomePage() {
  return (
    <PublicSiteShell>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-8 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-cyan-400/[0.06] blur-3xl"
        />

        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-16 lg:pb-28 lg:pt-28">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
              More Jobs. Less Guesswork.
            </div>

            <h1 className="mt-5 max-w-3xl text-5xl font-bold leading-[0.98] tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">
              Someone has to keep growth moving.
            </h1>

            <p className="mt-7 max-w-2xl text-xl font-medium leading-8 text-white/90 sm:text-2xl sm:leading-9">
              You run the business. MarketForge grows it.
            </p>

            <p className="mt-5 max-w-2xl text-base leading-7 text-white/68 sm:text-lg sm:leading-8">
              MarketForge keeps the growth responsibility moving forward:
              understanding the business, identifying worthwhile opportunities,
              recommending what deserves attention, helping turn decisions into
              execution, and keeping the resulting business outcomes visible.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/growth-strategy-session"
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 px-6 py-3.5 text-base font-semibold text-white shadow-[0_16px_40px_rgba(34,211,238,0.18)] transition hover:scale-[1.01]"
              >
                See MarketForge on My Business
              </Link>

              <Link
                href="/how-marketforge-works"
                className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/[0.03] px-6 py-3.5 text-base font-semibold text-white/85 transition hover:border-white/25 hover:bg-white/[0.07]"
              >
                See How It Works
              </Link>
            </div>

            <p className="mt-5 max-w-xl text-sm leading-6 text-white/50">
              The Growth Strategy Session is a prepared demonstration using
              your actual business—not a generic product tour.
            </p>
          </div>

          <div className="relative">
            <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-3 shadow-[0_32px_90px_rgba(0,0,0,0.42)]">
              <div className="rounded-[25px] border border-white/10 bg-[#0c151f] p-4 sm:p-5">
                <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      MarketForge Command Center
                    </div>
                    <div className="mt-1 text-xs leading-5 text-white/45">
                      What deserves attention now
                    </div>
                  </div>

                  <div className="w-fit rounded-full border border-cyan-300/15 bg-cyan-300/[0.08] px-3 py-1 text-xs font-semibold text-cyan-200">
                    Revenue Operating System
                  </div>
                </div>

                <div className="mt-4 overflow-hidden rounded-[20px] border border-white/10 bg-[#081018]">
                  <Image
                    src="/marketforge-demo-command-center.png"
                    alt="MarketForge Command Center showing growth opportunities and execution"
                    width={1600}
                    height={1000}
                    className="h-auto w-full object-cover"
                    priority
                  />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300/75">
                      Recommendation
                    </div>
                    <p className="mt-2 text-sm leading-6 text-white/68">
                      See the opportunity MarketForge believes deserves
                      attention first.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300/75">
                      Business context
                    </div>

                    <p className="mt-2 text-sm leading-6 text-white/68">
                      See the capacity, value, competitive position, and other context behind
                      what MarketForge recommends.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-10 -top-8 h-36 w-36 rounded-full bg-cyan-400/10 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-10 -left-8 h-36 w-36 rounded-full bg-indigo-500/10 blur-3xl"
            />
          </div>
        </div>
      </section>

      {/* Recognition */}
      <section className="border-b border-white/10 bg-white/[0.025]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:gap-16">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
                Growth still needs an owner
              </div>

              <h2 className="mt-4 text-4xl font-bold tracking-[-0.03em] text-white sm:text-5xl">
                Running the business already takes the whole day.
              </h2>

              <p className="mt-6 max-w-xl text-base leading-7 text-white/65 sm:text-lg sm:leading-8">
                Customers need service. Employees need answers. Jobs need to
                get done. Cash flow, scheduling, equipment, hiring, and
                everything else still belong to the operating business.
              </p>

              <p className="mt-5 max-w-xl text-base leading-7 text-white/80 sm:text-lg sm:leading-8">
                Growth does not stop needing attention just because the owner
                has more important things to do today.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-[#0c151f]/75 p-6">
                <div className="text-sm font-semibold text-white">
                  The opportunity changes
                </div>
                <p className="mt-3 text-sm leading-6 text-white/62">
                  Seasonality, capacity, services, competitors, priorities, and
                  business economics all change what deserves attention.
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-[#0c151f]/75 p-6">
                <div className="text-sm font-semibold text-white">
                  Execution still has to happen
                </div>
                <p className="mt-3 text-sm leading-6 text-white/62">
                  A good idea does not create a result until someone turns it
                  into real work and moves it forward.
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-[#0c151f]/75 p-6">
                <div className="text-sm font-semibold text-white">
                  Results need context
                </div>
                <p className="mt-3 text-sm leading-6 text-white/62">
                  Leads, jobs, and revenue matter most when they help the
                  business make a better next decision.
                </p>
              </div>

              <div className="rounded-3xl border border-cyan-300/20 bg-cyan-300/[0.06] p-6">
                <div className="text-sm font-semibold text-cyan-200">
                  MarketForge keeps it moving
                </div>
                <p className="mt-3 text-sm leading-6 text-white/72">
                  The growth responsibility becomes a repeatable operating
                  function instead of another item waiting on the owner.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
            Revenue Operating System
          </div>

          <h2 className="mt-4 text-4xl font-bold tracking-[-0.03em] text-white sm:text-5xl">
            Growth works better when the whole process is connected.
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-white/66 sm:text-lg sm:leading-8">
            A Revenue Operating System continuously identifies growth
            opportunities, recommends what deserves attention, turns chosen
            opportunities into execution, measures resulting business
            outcomes, and uses that context to improve what happens next.
          </p>

          <Link
            href="/revenue-operating-system"
            className="mt-7 inline-flex text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
          >
            Understand the Revenue Operating System →
          </Link>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-5">
          {growthResponsibilities.map((item) => (
            <div
              key={item.number}
              className="rounded-3xl border border-white/10 bg-white/[0.035] p-5"
            >
              <div className="text-xs font-semibold tracking-[0.18em] text-cyan-300/70">
                {item.number}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-white/58">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Product lifecycle */}
      <section className="border-y border-white/10 bg-white/[0.025]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
          <div className="max-w-3xl">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
              How MarketForge works
            </div>

            <h2 className="mt-4 text-4xl font-bold tracking-[-0.03em] text-white sm:text-5xl">
              Find. Choose. Execute. Measure.
            </h2>

            <p className="mt-6 text-base leading-7 text-white/66 sm:text-lg sm:leading-8">
              The product follows the same lifecycle the business needs for
              growth. It does not stop at identifying an opportunity or
              producing another recommendation.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-4">
            {lifecycleSteps.map((step) => (
              <div
                key={step.number}
                className="rounded-3xl border border-white/10 bg-[#0c151f]/70 p-6"
              >
                <div className="text-sm font-semibold text-cyan-300">
                  {step.number}
                </div>
                <h3 className="mt-4 text-2xl font-semibold tracking-tight text-white">
                  {step.title}
                </h3>
                <p className="mt-4 text-sm leading-6 text-white/62">
                  {step.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <Link
              href="/how-marketforge-works"
              className="inline-flex text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
            >
              See the full product lifecycle →
            </Link>
          </div>
        </div>
      </section>

      {/* Recommendation + choice */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
              MarketForge recommends. The business chooses.
            </div>

            <h2 className="mt-4 text-4xl font-bold tracking-[-0.03em] text-white sm:text-5xl">
              A clear recommendation does not have to mean a single choice.
            </h2>

            <p className="mt-6 text-base leading-7 text-white/66 sm:text-lg sm:leading-8">
              MarketForge makes the strongest recommendation visible and keeps
              additional worthwhile opportunities available because the owner
              may know something the system does not.
            </p>

            <p className="mt-5 text-base leading-7 text-white/82 sm:text-lg sm:leading-8">
              Good business judgment should be supported by the system—not
              replaced by it.
            </p>

            <Link
              href="/how-growth-works"
              className="mt-7 inline-flex text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
            >
              See how MarketForge thinks about growth →
            </Link>
          </div>

          <div className="grid gap-4">
            <div className="rounded-3xl border border-cyan-300/20 bg-gradient-to-br from-cyan-300/[0.09] to-blue-500/[0.04] p-6 sm:p-7">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
                Top priority
              </div>
              <h3 className="mt-3 text-xl font-semibold text-white">
                The opportunity that appears to deserve attention first
              </h3>
              <p className="mt-3 text-sm leading-6 text-white/65">
                Ranked using the business context MarketForge understands—not
                simply the popularity of a tactic.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-7">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                More revenue opportunities
              </div>
              <h3 className="mt-3 text-xl font-semibold text-white">
                Strong alternatives remain visible
              </h3>
              <p className="mt-3 text-sm leading-6 text-white/62">
                The owner can choose another worthwhile opportunity when
                additional business context points in a different direction.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Owner-directed / commercial truth */}
      <section className="border-y border-white/10 bg-white/[0.025]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-16 lg:py-24">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
              Your objective can enter the system too
            </div>

            <h2 className="mt-4 text-4xl font-bold tracking-[-0.03em] text-white sm:text-5xl">
              MarketForge does not have to originate every growth idea.
            </h2>

            <p className="mt-6 text-base leading-7 text-white/66 sm:text-lg sm:leading-8">
              When you already know what you want to accomplish, Request an
              Action gives you a structured way to introduce that objective and
              move it through the same review-and-execution lifecycle.
            </p>

            <p className="mt-5 text-base leading-7 text-white/82 sm:text-lg sm:leading-8">
              That includes residential objectives and commercial account
              pursuits. Commercial work is owner-directed rather than ranked
              alongside MarketForge&apos;s residential opportunity
              recommendations.
            </p>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-3 shadow-[0_28px_70px_rgba(0,0,0,0.32)]">
            <div className="rounded-[25px] border border-white/10 bg-[#0c151f] p-4">
              <div className="border-b border-white/10 px-2 pb-4">
                <div className="text-sm font-semibold text-white">
                  Request an Action
                </div>
                <div className="mt-1 text-xs text-white/45">
                  Start with the objective
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-[18px] border border-white/10 bg-[#081018]">
                <Image
                  src="/marketforge-demo-request-action.png"
                  alt="Summit Heating & Air example workspace showing the Residential and Commercial Request an Action choices"
                  width={1208}
                  height={584}
                  className="h-auto w-full"
                  sizes="(min-width: 1024px) 52vw, 100vw"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Outcomes */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
              Measure the results
            </div>

            <h2 className="mt-4 text-4xl font-bold tracking-[-0.03em] text-white sm:text-5xl">
              Growth should eventually show up in the business.
            </h2>

            <p className="mt-6 text-base leading-7 text-white/66 sm:text-lg sm:leading-8">
              MarketForge keeps outcomes visible in terms local service
              businesses actually care about while avoiding claims of perfect
              attribution where the evidence cannot support them.
            </p>

            <p className="mt-5 text-base leading-7 text-white/82">
              The goal is not more reporting. The goal is better context for
              what the business should do next.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {outcomeItems.map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-white/10 bg-white/[0.035] p-6"
              >
                <h3 className="text-xl font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-white/60">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Knowledge / trust */}
      <section className="border-y border-white/10 bg-white/[0.025]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:gap-16">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
                Understand the thinking
              </div>

              <h2 className="mt-4 text-4xl font-bold tracking-[-0.03em] text-white sm:text-5xl">
                MarketForge should be understandable before it asks for your
                trust.
              </h2>

              <p className="mt-6 max-w-2xl text-base leading-7 text-white/66 sm:text-lg sm:leading-8">
                The Knowledge Center explains the principles behind opportunity
                selection, recommendations, execution, measurement, competitor
                context, busy-season growth, and the Revenue Operating System
                itself.
              </p>

              <Link
                href="/knowledge"
                className="mt-7 inline-flex text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
              >
                Explore the Knowledge Center →
              </Link>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0c151f]/75 p-7">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                The operating principle
              </div>

              <blockquote className="mt-5 text-2xl font-semibold leading-9 tracking-tight text-white">
                Start with the opportunity. Then decide how to execute it.
              </blockquote>

              <p className="mt-5 text-sm leading-6 text-white/58">
                MarketForge is built around business objectives rather than a
                predetermined channel, tactic, or activity.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why MarketForge */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
            Built around the business
          </div>

          <h2 className="mt-4 text-4xl font-bold tracking-[-0.03em] text-white sm:text-5xl">
            MarketForge earns its place when the business wins.
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-white/66 sm:text-lg sm:leading-8">
            The product should reduce the amount of growth work the business has
            to manage without reducing visibility, business judgment, or
            control over the decision.
          </p>

          <Link
            href="/why-marketforge"
            className="mt-7 inline-flex text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
          >
            Why MarketForge is built this way →
          </Link>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="border-t border-white/10 bg-white/[0.025]">
        <div className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 sm:py-24 lg:py-28">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
            See it on your business
          </div>

          <h2 className="mx-auto mt-4 max-w-4xl text-4xl font-bold tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
            What would MarketForge find in your business?
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-white/66 sm:text-lg sm:leading-8">
            Give us your business name and website. MarketForge will do the
            initial research before we meet, then we&apos;ll use the session to
            confirm the context only you know and show you how the system works
            on your actual business.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/growth-strategy-session"
              className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 px-7 py-4 text-base font-semibold text-white shadow-[0_16px_40px_rgba(34,211,238,0.18)] transition hover:scale-[1.01] sm:w-auto"
            >
              See MarketForge on My Business
            </Link>

            <Link
              href="/how-marketforge-works"
              className="inline-flex w-full items-center justify-center rounded-xl border border-white/15 bg-white/[0.03] px-7 py-4 text-base font-semibold text-white/82 transition hover:border-white/25 hover:bg-white/[0.07] sm:w-auto"
            >
              See How It Works
            </Link>
          </div>

          <p className="mt-5 text-sm leading-6 text-white/45">
            Prepared around your business. No generic demo required.
          </p>
        </div>
      </section>
    </PublicSiteShell>
  );
}