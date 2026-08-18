import type { Metadata } from "next";

import { JsonLd } from "@/components/public-site/json-ld";
import { PrincipleCard } from "@/components/public-site/principle-card";
import { PublicPageHero } from "@/components/public-site/public-page-hero";
import { PublicSection } from "@/components/public-site/public-section";
import { PublicSiteShell } from "@/components/public-site/public-site-shell";
import { buildPublicMetadata } from "@/lib/public-site/metadata";
import {
  buildFounderSchema,
  buildWebPageSchema,
} from "@/lib/public-site/structured-data";
import { MARKETFORGE_TERMINOLOGY } from "@/lib/public-site/terminology";

const title = "Why MarketForge";
const description =
  "MarketForge is built around owner judgment, visible execution, honest measurement, and the belief that it should earn its place through usefulness, trust, and business outcomes.";

export const metadata: Metadata = buildPublicMetadata({
  title,
  description,
  path: "/why-marketforge",
});

export default function WhyMarketForgePage() {
  return (
    <PublicSiteShell>
      <JsonLd
        data={[
          buildWebPageSchema({
            name: title,
            description,
            path: "/why-marketforge",
          }),
          buildFounderSchema(),
        ]}
      />

      <PublicPageHero
        eyebrow="Why MarketForge"
        title="Growth software should make the business stronger, not more dependent."
        description={
          <>
            <p>
              MarketForge is built around a simple standard: the system should
              reduce the burden of growth while preserving the judgment,
              visibility, and control of the people running the business.
            </p>

            <p className="mt-4 font-medium text-white/88">
              When the business wins, MarketForge earns its place.
            </p>
          </>
        }
      />

      <PublicSection
        className="border-y border-white/10 bg-white/[0.02]"
        contentClassName="max-w-5xl"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <PrincipleCard title="You keep the decision">
            MarketForge should make the decision easier, not remove the owner
            from it. The system recommends. The business chooses.
          </PrincipleCard>

          <PrincipleCard title="You can see the work">
            Reducing owner effort should never require hiding what is happening.
            Recommendations, actions, execution status, and outcomes should
            remain understandable.
          </PrincipleCard>

          <PrincipleCard title="MarketForge owns what it can">
            Work the system can reasonably absorb should not be pushed back onto
            the owner simply because another tool could technically make them
            do it.
          </PrincipleCard>

          <PrincipleCard title="Business outcomes are the standard">
            Activity can be useful context, but leads, booked jobs, booked
            revenue, and meaningful business progress matter more than vanity
            metrics.
          </PrincipleCard>
        </div>
      </PublicSection>

      <PublicSection contentClassName="max-w-5xl">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
            Owner judgment
          </div>

          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            The person running the business knows things the system cannot.
          </h2>

          <p className="mt-5 text-base leading-7 text-white/68 sm:text-lg sm:leading-8">
            Software can evaluate more information, organize possibilities, and
            narrow the decision space. It still does not live inside the
            business. The owner may know about a staffing issue, relationship,
            upcoming job, local reputation concern, commercial opportunity, or
            priority the system cannot observe.
          </p>

          <div className="mt-7 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.06] p-5 sm:p-6">
            <p className="text-lg font-medium leading-8 text-white/90">
              {MARKETFORGE_TERMINOLOGY.recommendationDoctrine}
            </p>
          </div>
        </div>
      </PublicSection>

      <PublicSection
        className="border-y border-white/10 bg-white/[0.02]"
        contentClassName="max-w-5xl"
      >
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
            Trust
          </div>

          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            A useful system should be honest about what it knows.
          </h2>

          <p className="mt-5 text-base leading-7 text-white/68 sm:text-lg sm:leading-8">
            MarketForge should not manufacture certainty, invent proof, or
            present activity as a business result. Recommendations are
            recommendations. Attribution has limits. Business conditions
            change. Better decisions come from making those realities visible,
            not hiding them behind stronger-sounding claims.
          </p>
        </div>
      </PublicSection>

      <PublicSection contentClassName="max-w-5xl">
        <div
          id="patrick-donovan"
          className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-8"
        >
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
            Founder
          </div>

          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
            Patrick Donovan
          </h2>

          <p className="mt-2 text-sm font-medium text-white/50">
            Founder, MarketForge
          </p>

          <div className="mt-6 max-w-3xl space-y-5 text-base leading-7 text-white/68">
            <p>
              Patrick started his career as an automotive technician before
              moving into analytics, measurement, and business strategy. Over
              more than two decades, his work has included leadership and
              analytics roles spanning Meta, Cardlytics, Zeta Global, and KPMG.
            </p>

            <p>
              He holds a Master&apos;s degree in Applied Statistics and a
              Bachelor&apos;s degree in Marketing. MarketForge combines that
              analytical background with a practical view of how local service
              businesses actually operate.
            </p>

            <p>
              The goal is not to make a local service business operate like a
              miniature enterprise. It is to bring the useful parts of
              disciplined decision-making, measurement, and execution into a
              system designed around the realities of the owner.
            </p>
          </div>
        </div>
      </PublicSection>

      <PublicSection
        className="border-y border-white/10 bg-white/[0.02]"
        contentClassName="max-w-5xl"
      >
        <div className="max-w-3xl">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            MarketForge should keep earning its place.
          </h2>

          <p className="mt-5 text-base leading-7 text-white/68 sm:text-lg sm:leading-8">
            Retention should come from outcomes, usefulness, and trust—not from
            making the business dependent on complexity it cannot unwind.
          </p>

          <p className="mt-6 text-lg font-medium leading-8 text-white/90">
            You run the business. MarketForge grows it.
          </p>
        </div>
      </PublicSection>
    </PublicSiteShell>
  );
}