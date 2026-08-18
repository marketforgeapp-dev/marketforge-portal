import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/public-site/json-ld";
import { PrincipleCard } from "@/components/public-site/principle-card";
import { PublicPageHero } from "@/components/public-site/public-page-hero";
import { PublicSection } from "@/components/public-site/public-section";
import { PublicSiteShell } from "@/components/public-site/public-site-shell";
import { StrategySessionForm } from "@/components/public-site/strategy-session-form";
import { buildPublicMetadata } from "@/lib/public-site/metadata";
import { buildWebPageSchema } from "@/lib/public-site/structured-data";

const title = "Growth Strategy Session";
const description =
  "See MarketForge working on your actual business. Share your business name and website, and we’ll prepare before the session so you can review real opportunities, recommendations, and execution.";

export const metadata: Metadata = buildPublicMetadata({
  title,
  description,
  path: "/growth-strategy-session",
});

export default function GrowthStrategySessionPage() {
  return (
    <PublicSiteShell>
      <JsonLd
        data={buildWebPageSchema({
          name: title,
          description,
          path: "/growth-strategy-session",
        })}
      />

      <PublicPageHero
        eyebrow="Growth Strategy Session"
        title="See MarketForge working on your business."
        description={
          <>
            <p>
              Give us your business name and website. MarketForge will do the
              initial research and prepare the business before we meet, so the
              session can start with your actual context instead of a blank
              demo account.
            </p>

            <p className="mt-4 font-medium text-white/88">
              We’ll use the session to confirm the information only you know.
            </p>
          </>
        }
      />

      <PublicSection
        className="border-y border-white/10 bg-white/[0.02]"
        contentClassName="max-w-5xl"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <PrincipleCard
            eyebrow="01"
            title="Send us your business"
          >
            Your business name and website give MarketForge the starting point
            for preparation.
          </PrincipleCard>

          <PrincipleCard
            eyebrow="02"
            title="We prepare MarketForge"
          >
            We review the public business context that can be discovered before
            asking for your time.
          </PrincipleCard>

          <PrincipleCard
            eyebrow="03"
            title="Use the real product"
          >
            Confirm the context only you know, review what MarketForge
            recommends, choose an action, test an owner-directed objective, and
            see how outcomes are measured.
          </PrincipleCard>
        </div>
      </PublicSection>

      <PublicSection contentClassName="max-w-5xl">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
              We do the homework first
            </div>

            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              The session should start with your business—not a questionnaire.
            </h2>

            <p className="mt-5 text-base leading-7 text-white/68">
              MarketForge can prepare an initial view of your website,
              services, local market, competitive landscape, reputation, and
              online presence before the session.
            </p>

            <p className="mt-5 text-base leading-7 text-white/68">
              During the session, we focus on what public research cannot know:
              pricing, capacity, priorities, budget, and corrections that need
              owner context.
            </p>

            <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.035] p-5">
              <div className="text-sm font-semibold text-white">
                No private systems are needed for the initial preparation.
              </div>

              <p className="mt-2 text-sm leading-6 text-white/55">
                You confirm or adjust anything that needs context before we
                look at what MarketForge recommends.
              </p>
            </div>
          </div>

          <StrategySessionForm />
        </div>
      </PublicSection>

      <PublicSection
        className="border-y border-white/10 bg-white/[0.02]"
        contentClassName="max-w-5xl"
      >
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
            What you’ll see
          </div>

          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            This is a prepared product session, not a generic demo.
          </h2>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <PrincipleCard title="What MarketForge recommends">
            Review the top residential growth recommendation and the other
            worthwhile opportunities MarketForge keeps available.
          </PrincipleCard>

          <PrincipleCard title="What you choose">
            Select an opportunity and see how it moves into an executable
            action rather than stopping as an idea.
          </PrincipleCard>

          <PrincipleCard title="What you want to pursue">
            Request an Action demonstrates how an owner can introduce an
            objective outside the ranked recommendation set, including a
            commercial pursuit when relevant.
          </PrincipleCard>

          <PrincipleCard title="What happens afterward">
            See how approved work stays visible through execution and how
            leads, booked jobs, and booked revenue appear in reporting.
          </PrincipleCard>
        </div>
      </PublicSection>

      <PublicSection contentClassName="max-w-5xl">
        <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-8">
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            Want to understand the product before scheduling?
          </h2>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/62">
            See the recommendation, owner-choice, Request an Action, execution,
            and measurement lifecycle before deciding whether you want to see
            it applied to your business.
          </p>

          <Link
            href="/how-marketforge-works"
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
          >
            How MarketForge Works
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </PublicSection>
    </PublicSiteShell>
  );
}