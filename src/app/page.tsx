import Image from "next/image";
import Link from "next/link";

const heroStats = [
  { label: "Revenue opportunities surfaced", value: "24" },
  { label: "Launch-ready actions generated", value: "12" },
  { label: "Booked jobs influenced", value: "$38.4K" },
];

const featurePills = [
  "Revenue opportunity engine",
  "Launch-ready actions",
  "Natural language builder",
  "Execution pipeline",
  "AEO / SEO / Blog generation",
  "Revenue tracking",
];

const proofPills = [
  "Command Center",
  "Action Detail",
  "Natural language opportunity builder",
  "Revenue tracking",
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#081018] text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.20),transparent_30%),radial-gradient(circle_at_top_right,rgba(99,102,241,0.14),transparent_28%)]" />

      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#081018]/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Image
              src="/MarketForge_Logo.jpeg"
              alt="MarketForge"
              width={56}
              height={56}
              className="h-14 w-14 rounded-xl object-cover ring-1 ring-white/10"
              priority
            />
            <div>
              <div className="text-2xl font-semibold tracking-tight">
                MarketForge
              </div>
              <div className="text-sm text-white/55">
                Revenue execution for booked jobs
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/portal"
              className="rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-white/85 transition hover:bg-white/10"
            >
              Sign In
            </Link>
            <Link
              href="/onboarding"
              className="rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(59,130,246,0.35)] transition hover:scale-[1.01]"
            >
              Start Using MarketForge
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-14 px-6 pb-20 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pt-20">
        <div>
          <div className="inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-200">
            Revenue opportunity system
          </div>

          <h1 className="mt-8 max-w-4xl text-5xl font-semibold leading-tight tracking-tight md:text-6xl">
            Turn missed demand into booked jobs.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/72">
            MarketForge identifies missed revenue opportunities, builds the actions to
            capture them, and drives execution inside one system — so demand turns into
            booked jobs instead of getting lost.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <p className="mt-6 text-sm text-white/50">
                Built from real execution across social, local, content, and search visibility channels — not theory.
            </p>
            {featurePills.map((pill) => (
              <span
                key={pill}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70"
              >
                {pill}
              </span>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/onboarding"
              className="rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 px-6 py-3.5 text-base font-semibold text-white shadow-[0_12px_30px_rgba(59,130,246,0.35)] transition hover:scale-[1.01]"
            >
              Start Using MarketForge
            </Link>

            <Link
              href="/portal"
              className="rounded-xl border border-white/15 px-6 py-3.5 text-base font-medium text-white/85 transition hover:bg-white/10"
            >
              Sign In
            </Link>
          </div>

          <div className="mt-10 grid max-w-2xl gap-4 sm:grid-cols-3">
            {heroStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
              >
                <div className="text-2xl font-semibold tracking-tight">
                  {stat.value}
                </div>
                <div className="mt-1 text-sm leading-6 text-white/60">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
  <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-3 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
    <div className="rounded-[24px] border border-white/10 bg-[#0D1620] p-3">
      <div className="flex items-center justify-between border-b border-white/10 px-3 pb-3">
        <div>
          <div className="text-sm font-medium text-white/55">
            MarketForge Command Center
          </div>
          <div className="mt-1 text-xs text-white/50">
            Real product view tied to revenue opportunities, actions, and booked jobs
          </div>
        </div>

        <div className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-300">
          Live Product
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-[18px] border border-white/10">
        <Image
          src="/hero-command-center-demo.png"
          alt="MarketForge Command Center screenshot"
          width={1600}
          height={1000}
          className="h-auto w-full object-cover"
          priority
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-white/45">
            What you’re seeing
          </div>
          <div className="mt-2 text-sm leading-6 text-white/72">
            Ranked revenue opportunities, action value, execution readiness,
            and captured revenue in one operating view.
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-white/45">
            Why it matters
          </div>
          <div className="mt-2 text-sm leading-6 text-white/72">
            This is not a dashboard of vanity metrics. It is the system your
            team uses to decide what to do next and what revenue it should influence.
          </div>
        </div>
      </div>
    </div>
  </div>

  <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-cyan-500/20 blur-3xl" />
  <div className="pointer-events-none absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-indigo-500/20 blur-3xl" />
</div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.03]">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Most revenue is won or lost before anyone acts on the opportunity.
            </h2>
            <p className="mt-5 text-lg leading-8 text-white/70">
              The problem usually is not a lack of effort. It is the lack of a
              system that identifies real opportunities, turns them into
              executable actions, and keeps momentum moving until revenue is
              captured.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm font-medium uppercase tracking-[0.18em] text-cyan-300/80">
              How it works
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              How MarketForge drives booked jobs
            </h2>
          </div>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-7">
            <div className="text-sm font-medium text-cyan-300">
              01
            </div>
            <h3 className="mt-4 text-xl font-semibold">
              Identify and create opportunities
            </h3>
            <p className="mt-4 text-base leading-7 text-white/70">
              MarketForge surfaces where demand exists across services,
              geography, local competition, and search presence.
            </p>
            <p className="mt-3 text-base leading-7 text-white/70">
              You can also describe your own revenue opportunity in plain
              English and turn it into a structured execution path instantly.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-7">
            <div className="text-sm font-medium text-cyan-300">
              02
            </div>
            <h3 className="mt-4 text-xl font-semibold">
              Generate launch-ready actions
            </h3>
            <p className="mt-4 text-base leading-7 text-white/70">
              Paid demand capture, local presence improvements, AEO, SEO,
              educational content, email, and more are built for you as
              executable actions — not generic suggestions.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-7">
            <div className="text-sm font-medium text-cyan-300">
              03
            </div>
            <h3 className="mt-4 text-xl font-semibold">
              Execute and track revenue impact
            </h3>
            <p className="mt-4 text-base leading-7 text-white/70">
              Move actions through a clear workflow, launch with confidence, and
              see what turns into leads, booked jobs, and revenue.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.03]">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Before and after MarketForge
          </h2>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-[#0C141E] p-7">
              <h3 className="text-xl font-semibold text-white/85">
                Without MarketForge
              </h3>
              <ul className="mt-6 space-y-4 text-base text-white/65">
                <li>• Revenue opportunities stay buried in day-to-day noise</li>
                <li>• Teams rely on agencies, scattered tools, or guesswork</li>
                <li>• Marketing actions feel disconnected from booked jobs</li>
                <li>• Local demand is missed even when it clearly exists</li>
                <li>• Visibility exists, but execution is inconsistent</li>
              </ul>
            </div>

            <div className="rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-blue-600/20 via-cyan-500/10 to-indigo-600/20 p-7">
              <h3 className="text-xl font-semibold">
                With MarketForge
              </h3>
              <ul className="mt-6 space-y-4 text-base text-white/78">
                <li>• High-value opportunities are surfaced continuously</li>
                <li>• Revenue actions are generated instantly</li>
                <li>• Teams know exactly what to launch next</li>
                <li>• Execution moves through a clear pipeline</li>
                <li>• Jobs and revenue are visible in the same system</li>
              </ul>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
  {proofPills.map((pill) => (
    <span
      key={pill}
      className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200"
    >
      {pill}
    </span>
  ))}
</div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">
            <div className="text-sm font-medium uppercase tracking-[0.18em] text-cyan-300/80">
              Flexibility layer
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">
              Create any revenue opportunity on demand
            </h2>
            <p className="mt-5 text-base leading-7 text-white/70">
              Need to react to seasonality, launch a specific service push, or
              create a new angle fast?
            </p>
            <p className="mt-3 text-base leading-7 text-white/70">
              Just describe what you want in plain English. MarketForge
              structures the opportunity, builds the supporting assets, and adds
              it directly into your execution pipeline.
            </p>
          </div>

          <div className="relative">
  <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-3 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
    <div className="rounded-[24px] border border-white/10 bg-[#0D1620] p-3">

      <div className="flex items-center justify-between border-b border-white/10 px-3 pb-3">
        <div>
          <div className="text-sm font-medium text-white/55">
            Natural Language Opportunity Builder
          </div>
          <div className="mt-1 text-xs text-white/50">
            Create structured revenue actions in plain English
          </div>
        </div>

        <div className="rounded-full bg-cyan-400/15 px-3 py-1 text-xs font-semibold text-cyan-300">
          Live Input
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-[18px] border border-white/10">
        <Image
          src="/nl-action-generator.png"
          alt="MarketForge natural language opportunity builder"
          width={1600}
          height={1000}
          className="h-auto w-full object-cover"
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-white/45">
            What you do
          </div>
          <div className="mt-2 text-sm leading-6 text-white/72">
            Describe what you want to run in plain English — seasonal pushes,
            service promotions, or demand capture.
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-white/45">
            What MarketForge does
          </div>
          <div className="mt-2 text-sm leading-6 text-white/72">
            Builds the full opportunity, generates assets, and inserts it directly
            into your execution pipeline.
          </div>
        </div>
      </div>
    </div>
  </div>

  <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-cyan-500/20 blur-3xl" />
  <div className="pointer-events-none absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-indigo-500/20 blur-3xl" />
</div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-white/[0.03]">
        <div className="mx-auto max-w-5xl px-6 py-20 text-center">
          <Image
            src="/MarketForge_Logo.jpeg"
            alt="MarketForge"
            width={88}
            height={88}
            className="mx-auto h-20 w-20 rounded-2xl object-cover ring-1 ring-white/10"
          />

          <h2 className="mt-8 text-3xl font-semibold tracking-tight md:text-4xl">
            If revenue opportunities are being missed, MarketForge fixes the system behind it.
          </h2>

          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-white/70">
            Stop relying on scattered tools, slow agency loops, and disconnected reporting.
            Start running a system built to find opportunity, drive action, and turn
            demand into booked jobs.
          </p>
          <p className="mt-3 text-sm text-cyan-300">
            Every week without a system like this is lost revenue.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/onboarding"
              className="rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 px-7 py-3.5 text-base font-semibold text-white shadow-[0_12px_30px_rgba(59,130,246,0.35)] transition hover:scale-[1.01]"
            >
              Start Using MarketForge
            </Link>
            <Link
              href="/portal"
              className="rounded-xl border border-white/15 px-7 py-3.5 text-base font-medium text-white/85 transition hover:bg-white/10"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}