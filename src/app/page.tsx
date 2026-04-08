import Image from "next/image";
import Link from "next/link";

const heroStats = [
  { label: "Revenue opportunities worth acting on", value: "24" },
  { label: "Actions built and ready to launch", value: "12" },
  { label: "Jobs and revenue influenced", value: "$38.4K" },
];

const proofPills = [
  "Command Center",
  "Action Detail",
  "Natural language action builder",
  "Revenue tracking",
];

function MobileHomepage() {
  return (
    <main className="min-h-screen bg-[#081018] text-white sm:hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.20),transparent_30%),radial-gradient(circle_at_top_right,rgba(99,102,241,0.14),transparent_28%)]" />

      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#081018]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Image
              src="/MarketForge_Logo.jpeg"
              alt="MarketForge"
              width={40}
              height={40}
              className="h-10 w-10 rounded-xl object-cover ring-1 ring-white/10"
              priority
            />
            <div className="text-base font-semibold tracking-tight">
              MarketForge
            </div>
          </div>

          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-[0_10px_30px_rgba(59,130,246,0.35)] transition hover:scale-[1.01]"
          >
            Start Generating Revenue
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 pb-10 pt-8">
        <div className="inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3.5 py-2 text-xs font-medium text-cyan-200">
          Revenue execution system
        </div>

        <h1 className="mt-5 max-w-xs text-5xl font-bold leading-[0.95] tracking-tight text-white">
          More jobs. Less guesswork.
        </h1>

        <p className="mt-3 max-w-sm text-sm leading-6 text-white/70">
          Built for local service businesses that need more booked jobs — not
          more marketing work.
        </p>

        <p className="mt-4 max-w-xs text-base leading-6 text-white/80">
          You’re given what to do next — and it gets executed.
        </p>

          <div className="mt-6">
          <Link
            href="/sign-up"
            className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 px-6 py-4 text-base font-semibold text-white shadow-[0_16px_40px_rgba(59,130,246,0.42)] transition hover:scale-[1.01]"
          >
            Start Generating Revenue
          </Link>

          <p className="mt-2 text-center text-sm text-white/55">
            Takes less than 2 minutes. No setup headaches.
          </p>
        </div>

        <div className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300/85">
          What this looks like in your business
        </div>

                <div className="mt-3 grid gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5">
            <div className="text-3xl font-semibold tracking-tight">24</div>
            <div className="mt-1 text-sm leading-5 text-white/65">
              Revenue opportunities
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5">
            <div className="text-3xl font-semibold tracking-tight">12</div>
            <div className="mt-1 text-sm leading-5 text-white/65">
              Actions ready to launch
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5">
            <div className="text-3xl font-semibold tracking-tight">$38.4K</div>
            <div className="mt-1 text-sm leading-5 text-white/65">
              Revenue influenced
            </div>
          </div>
        </div>

        <p className="mx-auto mb-2 mt-6 max-w-md text-center text-sm leading-6 text-white/80">
          Every action is built from real demand signals — not templates or
          guesswork.
        </p>
      </section>

      <section className="border-y border-white/10 bg-white/[0.03]">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/85">
            Command Center
          </div>

          <div className="mt-4 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-2.5 shadow-[0_24px_60px_rgba(0,0,0,0.4)]">
            <div className="rounded-[20px] border border-white/10 bg-[#0D1620] p-2.5">
              <div className="relative overflow-hidden rounded-[16px] border border-white/10">
                <Image
                  src="/hero-command-center-demo.png"
                  alt="MarketForge Command Center screenshot"
                  width={1600}
                  height={1000}
                  className="h-[220px] w-full object-cover object-top opacity-90"
                  priority
                />
                <div className="pointer-events-none absolute inset-0 bg-[#081018]/15" />
              </div>
            </div>
          </div>

          <p className="mt-4 max-w-sm text-sm leading-6 text-white/78">
            This shows what to do next, what’s live, and what’s driving revenue.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-2 text-sm font-medium uppercase tracking-[0.16em] text-cyan-300">
          Here’s the problem.
        </div>

        <h2 className="text-3xl font-bold tracking-tight text-white">
          Most businesses are guessing what to do next — and losing jobs because of it.
        </h2>

        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4">
            <div className="text-base font-semibold text-white">
              Know what matters
            </div>
            <div className="mt-1 text-sm leading-6 text-white/70">
              The system identifies the highest-value actions.
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4">
            <div className="text-base font-semibold text-white">
              Go live faster
            </div>
            <div className="mt-1 text-sm leading-6 text-white/70">
              Actions are built and ready to launch.
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4">
            <div className="text-base font-semibold text-white">
              Execution happens
            </div>
            <div className="mt-1 text-sm leading-6 text-white/70">
              Work goes live across demand channels.
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4">
            <div className="text-base font-semibold text-white">
              Track real revenue
            </div>
            <div className="mt-1 text-sm leading-6 text-white/70">
              See what turns into booked jobs.
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.03]">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
            How it works
          </div>

          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
            How it works
          </h2>

          <div className="mt-6 space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white/85">
              <span className="mr-2 text-cyan-300">01</span>
              Identify opportunities
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white/85">
              <span className="mr-2 text-cyan-300">02</span>
              Build actions
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white/85">
              <span className="mr-2 text-cyan-300">03</span>
              Execute &amp; track revenue
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/85">
            Natural language
          </div>

          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
            Tell MarketForge what you want.
          </h2>

          <p className="mt-4 max-w-sm text-base leading-6 text-white/85">
            It builds it. Prepares it. Launches it.
          </p>

          <p className="mt-3 max-w-sm text-sm leading-6 text-white/70">
            Turn a simple request into a revenue-generating action.
          </p>

          <div className="mt-5 rounded-[20px] border border-white/10 bg-[#0D1620] p-2.5">
            <div className="relative overflow-hidden rounded-[14px] border border-white/10">
              <Image
                src="/nl-action-generator.png"
                alt="MarketForge natural language action builder"
                width={1600}
                height={1000}
                className="h-[200px] w-full object-cover object-top opacity-90"
              />
              <div className="pointer-events-none absolute inset-0 bg-[#081018]/15" />
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.03]">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-6 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              You don’t need more marketing.
            </h2>

            <p className="mx-auto mt-4 max-w-sm text-base leading-6 text-white/80">
              You need the right actions getting executed.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="text-3xl font-bold tracking-tight text-white">
          Before and after
        </h2>

        <div className="mt-6 space-y-4">
          <div className="rounded-3xl border border-white/10 bg-[#0C141E]/70 p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.16em] text-white/55">
              Without
            </div>
            <ul className="mt-4 space-y-3 text-base text-white/70">
              <li>• Guessing</li>
              <li>• Scattered tools</li>
              <li>• No clarity</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-cyan-400/35 bg-gradient-to-br from-blue-600/24 via-cyan-500/14 to-indigo-600/24 p-5 shadow-[0_18px_50px_rgba(34,211,238,0.10)]">
            <div className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-200">
              With
            </div>
            <ul className="mt-4 space-y-3 text-base text-white/86">
              <li>• Clear next actions</li>
              <li>• Execution handled</li>
              <li>• Revenue visibility</li>
            </ul>
          </div>
        </div>
      </section>

            <>
        <div className="mx-auto max-w-5xl px-4 pb-2 pt-4 text-center">
          <p className="text-lg leading-7 text-white">
            This isn’t marketing.
          </p>
          <p className="mt-1 text-lg leading-7 text-white">
            It’s a system that tells you what to do next — and gets it done.
          </p>
        </div>

        <section className="border-t border-white/10 bg-white/[0.03]">
          <div className="mx-auto max-w-5xl px-4 py-12 text-center">
          <Image
            src="/MarketForge_Logo.jpeg"
            alt="MarketForge"
            width={72}
            height={72}
            className="mx-auto h-16 w-16 rounded-2xl object-cover ring-1 ring-white/10"
          />

          <h2 className="mt-6 text-4xl font-bold tracking-tight text-white">
            More jobs. Less guesswork.
          </h2>

          <p className="mx-auto mt-4 max-w-sm text-base leading-6 text-white/80">
            Start generating revenue in minutes.
          </p>

          <div className="mt-8 flex flex-col items-stretch gap-3">
            <Link
              href="/sign-up"
              className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-[0_16px_40px_rgba(59,130,246,0.42)] transition hover:scale-[1.01]"
            >
              Start Generating Revenue
            </Link>

            <Link
              href="/sign-in"
              className="inline-flex w-full items-center justify-center rounded-xl border border-white/15 px-7 py-3.5 text-base font-medium text-white/85 transition hover:bg-white/10"
            >
              Sign In
            </Link>
          </div>

          <p className="mt-5 text-sm leading-6 text-cyan-300">
            Built for businesses that need more jobs — not more complexity.
          </p>
        </div>
              </section>
      </>
    </main>
  );
}

function DesktopHomepage() {
  return (
    <main className="hidden min-h-screen bg-[#081018] text-white sm:block">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.20),transparent_30%),radial-gradient(circle_at_top_right,rgba(99,102,241,0.14),transparent_28%)]" />

      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#081018]/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <Image
              src="/MarketForge_Logo.jpeg"
              alt="MarketForge"
              width={56}
              height={56}
              className="h-10 w-10 rounded-xl object-cover ring-1 ring-white/10 sm:h-14 sm:w-14"
              priority
            />
            <div>
              <div className="text-base font-semibold tracking-tight sm:text-2xl">
                MarketForge
              </div>
              <div className="hidden text-xs text-white/55 sm:block sm:text-sm">
                Revenue execution for booked jobs
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/sign-in"
              className="hidden rounded-xl border border-white/15 px-3 py-2 text-sm font-medium text-white/85 transition hover:bg-white/10 sm:inline-flex sm:px-4"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-[0_10px_30px_rgba(59,130,246,0.35)] transition hover:scale-[1.01] sm:px-5 sm:py-2.5 sm:text-sm"
            >
              Start Generating Revenue
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14 lg:pt-20">
        <div>
          <div className="inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-200">
            Revenue execution system
          </div>

          <h1 className="mt-6 max-w-3xl text-6xl font-bold leading-[0.92] tracking-tight text-white sm:mt-8 sm:text-7xl md:text-[80px]">
            More Jobs. Less Guesswork.
          </h1>

          <p className="mt-8 max-w-xl text-base leading-7 text-white/80 sm:mt-10 sm:text-lg sm:leading-8">
            Agency-level strategy, execution, and revenue tracking — all in one
            system.
          </p>

          <p className="mt-6 max-w-sm text-sm leading-6 text-white/72 sm:mt-4 sm:max-w-2xl sm:text-lg sm:leading-8">
            MarketForge identifies the actions most likely to drive revenue,
            executes them for you, and tracks what turns into leads, jobs, and
            revenue — so you don&apos;t have to think about marketing all day.
          </p>

          <div className="mt-5 text-sm text-white/88 sm:mt-6">
            No guesswork. No campaign building. No managing marketing.
          </div>

          <div className="mt-2 text-sm text-cyan-300">
            Start seeing what to do next in minutes. Best experienced on
            desktop.
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <Link
              href="/sign-up"
              className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 px-7 py-4 text-base font-semibold text-white shadow-[0_16px_40px_rgba(59,130,246,0.42)] transition hover:scale-[1.01] sm:w-auto"
            >
              Start Generating Revenue
            </Link>

            <Link
              href="/sign-in"
              className="inline-flex w-full items-center justify-center rounded-xl border border-white/15 px-6 py-3.5 text-base font-medium text-white/85 transition hover:bg-white/10 sm:w-auto"
            >
              Sign In
            </Link>
          </div>

          <div className="mt-5 max-w-sm text-sm leading-6 text-white/55 sm:mt-8 sm:max-w-2xl">
            MarketForge is not a marketing agency or another marketing engine.
            It is the system that identifies and executes the actions most
            likely to drive revenue — so you can focus on running your business.
          </div>

          <div className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/85 sm:mt-10">
            <span className="sm:hidden">What this looks like in your business</span>
            <span className="hidden sm:inline">Example workspace output</span>
          </div>

          <div className="mt-4 grid max-w-sm gap-5 sm:max-w-2xl sm:grid-cols-3 sm:gap-4">
            {heroStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
              >
                <div className="text-3xl font-semibold tracking-tight sm:text-2xl">
                  {stat.value}
                </div>
                <div className="mt-1 text-sm leading-6 text-white/60">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mt-2 lg:pl-2">
          <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-2.5 shadow-[0_30px_80px_rgba(0,0,0,0.45)] sm:rounded-[28px] sm:p-3">
            <div className="rounded-[24px] border border-white/10 bg-[#0D1620] p-3">
              <div className="flex items-center justify-between border-b border-white/10 px-3 pb-3">
                <div>
                  <div className="text-sm font-medium text-white/55">
                    MarketForge Command Center
                  </div>
                  <div className="mt-1 text-xs text-white/50">
                    Real product view tied to actions, execution, booked jobs,
                    and revenue
                  </div>
                </div>

                <div className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                  Live Product
                </div>
              </div>

              <div className="relative mt-3 overflow-hidden rounded-[18px] border border-white/10">
                <Image
                  src="/hero-command-center-demo.png"
                  alt="MarketForge Command Center screenshot"
                  width={1600}
                  height={1000}
                  className="h-auto w-full object-cover opacity-80"
                  priority
                />
                <div className="pointer-events-none absolute inset-0 bg-[#081018]/20" />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-white/45">
                    What this shows
                  </div>
                  <div className="mt-2 text-sm leading-6 text-white/72">
                    Revenue opportunities worth acting on, launch-ready actions,
                    execution status, and tracked revenue in one view.
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-white/45">
                    Why it matters
                  </div>
                  <div className="mt-2 text-sm leading-6 text-white/72">
                    This is not a dashboard full of noise. It shows what to do
                    next, what is live, and what is turning into jobs and
                    revenue.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-indigo-500/20 blur-3xl" />
        </div>
      </section>

      <section className="mt-10 border-y border-white/10 bg-[#09131d] sm:mt-16">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
              Stop guessing what to do next.
            </h2>
            <p className="mt-5 text-base leading-7 text-white/70 sm:text-lg sm:leading-8">
              Most businesses are guessing what to do next — and losing jobs
              because of it.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:gap-5 lg:grid-cols-4 lg:gap-6">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-6">
              <h3 className="text-lg font-semibold text-white">
                Know what actually matters
              </h3>
              <p className="mt-3 max-w-sm text-sm leading-6 text-white/70">
                <span className="font-semibold tracking-tight text-white">
                  No more guessing.
                </span>{" "}
                The system identifies the highest-value actions based on real
                demand.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-6">
              <h3 className="text-lg font-semibold text-white">
                Go from idea to live action
              </h3>
              <p className="mt-3 max-w-sm text-sm leading-6 text-white/70">
                <span className="font-semibold tracking-tight text-white">
                  No stalled execution.
                </span>{" "}
                Actions are fully built and ready to launch.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-6">
              <h3 className="text-lg font-semibold text-white">
                Actions actually get launched
              </h3>
              <p className="mt-3 max-w-sm text-sm leading-6 text-white/70">
                <span className="font-semibold tracking-tight text-white">
                  No more bottlenecks.
                </span>{" "}
                Work goes live across the channels that drive demand.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-6">
              <h3 className="text-lg font-semibold text-white">
                See what turns into real revenue
              </h3>
              <p className="mt-3 max-w-sm text-sm leading-6 text-white/70">
                <span className="font-semibold tracking-tight text-white">
                  No disconnected reporting.
                </span>{" "}
                Track leads, booked jobs, and revenue in one place.
              </p>
            </div>
          </div>

          <div className="mx-auto mt-8 max-w-4xl text-center">
            <p className="text-base leading-7 text-white/78 sm:text-lg sm:leading-8">
              Actions are launched across the channels that drive real demand —
              and tracked all the way through to booked jobs and revenue.
            </p>
            <p className="mt-4 text-sm leading-6 text-white/60 sm:text-base">
              Promote the right services at the right time. Capture demand when
              customers are searching.
            </p>
            <p className="mt-4 text-sm leading-6 text-cyan-200 sm:text-base">
              Built to execute revenue-driving actions — not just manage
              operations or report on them.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            What this looks like in practice
          </h2>
          <p className="mt-4 text-base leading-7 text-white/70 sm:text-lg sm:leading-8">
            Example output from a MarketForge workspace
          </p>
          <p className="mt-4 text-base leading-7 text-white/78 sm:text-lg sm:leading-8">
            This is not a dashboard. This is what your business is actively
            working toward — and what&apos;s turning into jobs and revenue.
          </p>
        </div>
      </section>

      <section className="mt-12 border-y border-white/10 bg-white/[0.03] sm:mt-20">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
                How it actually works
              </div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-5xl">
                How MarketForge drives revenue
              </h2>
            </div>
          </div>

          <div className="mt-10 grid gap-6 sm:gap-6 lg:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-7">
              <div className="text-sm font-medium text-cyan-300">01</div>
              <h3 className="mt-4 text-xl font-semibold">
                Identify the highest-value opportunities
              </h3>
              <p className="mt-4 text-base leading-7 text-white/70">
                MarketForge identifies where real demand exists across your
                services, market, and timing.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-7">
              <div className="text-sm font-medium text-cyan-300">02</div>
              <h3 className="mt-4 text-xl font-semibold">
                Build complete, ready-to-launch actions
              </h3>
              <p className="mt-4 text-base leading-7 text-white/70">
                Every opportunity becomes a fully built action — not a
                suggestion, not something you have to figure out.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-7">
              <div className="text-sm font-medium text-cyan-300">03</div>
              <h3 className="mt-4 text-xl font-semibold">
                Execute and track real revenue
              </h3>
              <p className="mt-4 text-base leading-7 text-white/70">
                Actions get launched and tracked against leads, booked jobs, and
                revenue.
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-cyan-400/30 bg-cyan-400/12 p-6 shadow-[0_0_0_1px_rgba(34,211,238,0.08),0_20px_50px_rgba(6,182,212,0.10)] sm:p-8">
            <div className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-300">
              Example
            </div>
            <p className="mt-4 text-base leading-7 text-white/90 sm:text-lg sm:leading-8">
              Promote a high-value service → capture inbound demand → turn it
              into booked jobs → track the revenue impact inside your workspace.
            </p>
          </div>

          <p className="mt-8 max-w-4xl text-base leading-7 text-white/78 sm:text-lg sm:leading-8">
            This is not a dashboard. This is what your business is actively
            working toward — and what&apos;s turning into jobs and revenue.
          </p>

          <p className="mt-4 max-w-3xl text-base leading-7 text-white/78 sm:text-lg sm:leading-8">
            You don&apos;t need to figure out what to do next. The system tells
            you — and gets it executed.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Most businesses are operating like this
        </h2>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-[#0C141E]/60 p-7">
            <h3 className="text-xl font-semibold text-white/85">
              Without MarketForge
            </h3>
            <ul className="mt-6 max-w-md space-y-5 text-base text-white/65">
              <li>• Guessing what to do next</li>
              <li>
                • Relying on agencies, scattered tools, or trying things and
                hoping they work
              </li>
              <li>• Actions that don&apos;t clearly turn into jobs</li>
              <li>• No visibility into what&apos;s actually working</li>
              <li>• Time lost managing instead of growing</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-cyan-400/40 bg-gradient-to-br from-blue-600/24 via-cyan-500/14 to-indigo-600/24 p-7 shadow-[0_18px_50px_rgba(34,211,238,0.10)]">
            <h3 className="text-xl font-semibold">With MarketForge</h3>
            <ul className="mt-6 max-w-md space-y-5 text-base text-white/78">
              <li>• Clear next actions at all times</li>
              <li>• Execution handled in one system</li>
              <li>• Work tied directly to jobs and revenue</li>
              <li>• Full visibility into what is driving growth</li>
              <li>• More time focused on running the business</li>
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
      </section>

      <section className="border-y border-white/10 bg-white/[0.03]">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-7 sm:p-10">
              <div className="text-sm font-medium uppercase tracking-[0.18em] text-cyan-300/80">
                Natural language
              </div>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight">
                Tell MarketForge what you want. It handles the rest.
              </h2>
              <p className="mt-5 max-w-sm text-base leading-7 text-white/80">
                Need to push a specific service? React to seasonality? Capture
                demand fast?
              </p>
              <p className="mt-4 max-w-sm text-base leading-7 text-white/85">
                Just say what you want.
              </p>
              <p className="mt-4 max-w-sm text-base leading-7 text-white/80">
                MarketForge builds the action, prepares everything needed, and
                moves it into execution.
              </p>
              <p className="mt-5 max-w-sm text-base leading-7 text-white/82">
                You&apos;re not starting from scratch. What you say turns into
                something that actually drives revenue.
              </p>
            </div>

            <div className="relative">
              <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-3 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
                <div className="rounded-[24px] border border-white/10 bg-[#0D1620] p-3">
                  <div className="flex items-center justify-between border-b border-white/10 px-3 pb-3">
                    <div>
                      <div className="text-sm font-medium text-white/55">
                        Natural Language Action Builder
                      </div>
                      <div className="mt-1 text-xs text-white/50">
                        Turn a plain-English request into a live revenue action
                      </div>
                    </div>

                    <div className="rounded-full bg-cyan-400/15 px-3 py-1 text-xs font-semibold text-cyan-300">
                      Live Input
                    </div>
                  </div>

                  <div className="relative mt-3 overflow-hidden rounded-[18px] border border-white/10">
                    <Image
                      src="/nl-action-generator.png"
                      alt="MarketForge natural language action builder"
                      width={1600}
                      height={1000}
                      className="h-auto w-full object-cover opacity-90"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-[#081018]/10" />
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="text-xs uppercase tracking-[0.16em] text-white/45">
                        What you do
                      </div>
                      <div className="mt-2 text-sm leading-6 text-white/72">
                        Describe what you want to run in plain English.
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="text-xs uppercase tracking-[0.16em] text-white/45">
                        What MarketForge does
                      </div>
                      <div className="mt-2 text-sm leading-6 text-white/72">
                        Builds the action, prepares the work, and puts it into
                        execution.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-cyan-500/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-indigo-500/20 blur-3xl" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-7xl px-4 py-16 sm:mt-20 sm:px-6 sm:py-24">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] px-6 py-10 text-center sm:px-10 sm:py-12">
          <h2 className="text-3xl font-bold tracking-tight text-white md:text-5xl">
            You don&apos;t need more marketing.
          </h2>

          <p className="mx-auto mt-5 max-w-sm text-base leading-7 text-white/78 sm:max-w-3xl sm:text-lg sm:leading-8">
            You need the right actions getting executed so more jobs actually
            get booked.
          </p>

          <p className="mx-auto mt-4 max-w-sm text-base leading-7 text-white/70 sm:max-w-3xl sm:text-lg sm:leading-8">
            That&apos;s where most marketing breaks — it never turns into real
            work getting done.
          </p>

          <div className="mx-auto mt-8 max-w-sm space-y-5 text-left text-base text-white/75 sm:max-w-2xl sm:space-y-4">
            <div>• it&apos;s slow</div>
            <div>• it&apos;s unclear</div>
            <div>• it doesn&apos;t turn into real revenue</div>
          </div>

          <p className="mt-8 max-w-sm text-base leading-7 text-white/85 sm:max-w-none sm:text-lg sm:leading-8">
            MarketForge fixes that by actually getting the work done.
          </p>

          <p className="mt-4 max-w-sm text-base leading-7 text-white/72 sm:max-w-none sm:text-lg sm:leading-8">
            This isn&apos;t about doing more. It&apos;s about doing the right
            things — and actually getting them done.
          </p>
        </div>
      </section>

      <section className="border-t border-white/10 bg-white/[0.03]">
        <div className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 sm:py-20">
          <Image
            src="/MarketForge_Logo.jpeg"
            alt="MarketForge"
            width={88}
            height={88}
            className="mx-auto h-20 w-20 rounded-2xl object-cover ring-1 ring-white/10"
          />

          <h2 className="mt-12 text-5xl font-bold tracking-tight text-white md:text-6xl">
            More jobs. Less guesswork.
          </h2>

          <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-white/78 sm:text-lg sm:leading-8">
            You don&apos;t need to think about marketing all day. You need a
            system that tells you what matters — and gets it executed.
          </p>

          <p className="mt-3 text-base leading-7 text-white/85 sm:text-lg sm:leading-8">
            MarketForge handles it.
          </p>

          <p className="mx-auto mt-3 max-w-3xl text-base leading-7 text-white/70 sm:text-lg sm:leading-8">
            Track what actually turns into revenue — not just clicks.
          </p>

          <div className="mt-10 flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center">
            <Link
              href="/sign-up"
              className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-[0_16px_40px_rgba(59,130,246,0.42)] transition hover:scale-[1.01] sm:w-auto"
            >
              Start Generating Revenue
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex w-full items-center justify-center rounded-xl border border-white/15 px-7 py-3.5 text-base font-medium text-white/85 transition hover:bg-white/10 sm:w-auto"
            >
              Sign In
            </Link>
          </div>

          <p className="mt-6 text-sm text-cyan-300">
            Set up in minutes. Built for businesses that need more jobs — not
            more complexity.
          </p>
        </div>
      </section>
    </main>
  );
}

export default function HomePage() {
  return (
    <>
      <MobileHomepage />
      <DesktopHomepage />
    </>
  );
}