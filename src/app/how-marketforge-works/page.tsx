import Image from "next/image";
import type { Metadata } from "next";

import { JsonLd } from "@/components/public-site/json-ld";
import { PrincipleCard } from "@/components/public-site/principle-card";
import { PublicPageHero } from "@/components/public-site/public-page-hero";
import { PublicSection } from "@/components/public-site/public-section";
import { PublicSiteShell } from "@/components/public-site/public-site-shell";
import { buildPublicMetadata } from "@/lib/public-site/metadata";
import { buildWebPageSchema } from "@/lib/public-site/structured-data";
import { MARKETFORGE_TERMINOLOGY } from "@/lib/public-site/terminology";

const title = "How MarketForge Works";

const description =
  "MarketForge understands the business, recommends worthwhile growth opportunities, lets the business choose or introduce another objective, helps turn the decision into execution, and keeps outcomes visible.";

export const metadata: Metadata = buildPublicMetadata({
  title,
  description,
  path: "/how-marketforge-works",
});

const steps = [
  {
    number: "01",
    label: "Find",
    title: "Understand the business and identify worthwhile opportunities.",
    body: "Business economics, capacity, priorities, market conditions, competitors, reputation, seasonality, and other available context shape what deserves consideration.",
  },
  {
    number: "02",
    label: "Choose",
    title: "Recommend what deserves attention while preserving owner judgment.",
    body: "MarketForge makes one recommendation clear and keeps other worthwhile opportunities visible. The business decides what to pursue.",
  },
  {
    number: "03",
    label: "Execute",
    title: "Turn the chosen direction into executable work.",
    body: "The selected opportunity or owner-directed objective moves into a structured action with the materials, review, approval, and execution steps appropriate to the objective.",
  },
  {
    number: "04",
    label: "Measure",
    title: "Connect the work back to business outcomes.",
    body: "Leads, booked jobs, booked revenue, execution status, and other relevant results remain visible so the business can understand what happened.",
  },
];

function ProductProofFrame({
  children,
  label = "Example workspace — HVAC",
}: {
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <div>
      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/42">
        {label}
      </div>

      <div className="overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.035] p-2 shadow-[0_24px_70px_rgba(0,0,0,0.28)] sm:p-3">
        <div className="overflow-hidden rounded-[20px] border border-white/10 bg-[#081018]">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function HowMarketForgeWorksPage() {
  return (
    <PublicSiteShell>
      <JsonLd
        data={buildWebPageSchema({
          name: title,
          description,
          path: "/how-marketforge-works",
        })}
      />

      <PublicPageHero
        eyebrow="How MarketForge Works"
        title="Find what matters. Choose what to pursue. Execute it. Measure what happened."
        description={
          <>
            <p>
              MarketForge is built around a recommendation-and-execution
              lifecycle rather than a collection of disconnected growth tools.
            </p>

            <p className="mt-4 font-medium text-white/88">
              {MARKETFORGE_TERMINOLOGY.recommendationDoctrine}
            </p>
          </>
        }
      />

      {/* Lifecycle */}
      <PublicSection
        className="border-y border-white/10 bg-white/[0.02]"
        contentClassName="max-w-5xl"
      >
        <div className="grid gap-4 md:grid-cols-2">
          {steps.map((step) => (
            <PrincipleCard
              key={step.number}
              eyebrow={`${step.number} · ${step.label}`}
              title={step.title}
            >
              {step.body}
            </PrincipleCard>
          ))}
        </div>
      </PublicSection>

      {/* Recommendation + optionality */}
      <PublicSection contentClassName="max-w-6xl">
        <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:gap-14">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
              The recommendation
            </div>

            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              MarketForge creates focus without pretending there is only one
              worthwhile choice.
            </h2>

            <p className="mt-5 text-base leading-7 text-white/68 sm:text-lg sm:leading-8">
              The core residential opportunity engine ranks what it believes
              deserves attention first. Other worthwhile opportunities remain
              available because the business may have context the system does
              not.
            </p>

            <div className="mt-7 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.06] p-5 sm:p-6">
              <p className="text-lg font-medium leading-8 text-white/90">
                {MARKETFORGE_TERMINOLOGY.optionalityDoctrine}
              </p>
            </div>
          </div>

          <ProductProofFrame>
            <Image
              src="/marketforge-demo-more-opportunities.png"
              alt="Summit Heating & Air example workspace showing ranked revenue opportunities beyond the top recommendation"
              width={298}
              height={534}
              className="mx-auto h-auto w-full max-w-[420px]"
            />
          </ProductProofFrame>
        </div>
      </PublicSection>

      {/* Request an Action */}
      <PublicSection
        className="border-y border-white/10 bg-white/[0.02]"
        contentClassName="max-w-6xl"
      >
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-16">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
              Request an Action
            </div>

            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              The business can introduce an objective outside the ranked set.
            </h2>

            <p className="mt-5 max-w-2xl text-base leading-7 text-white/68 sm:text-lg sm:leading-8">
              MarketForge&apos;s recommendation engine creates focus. Request
              an Action preserves flexibility when the owner already knows
              something else deserves attention.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <PrincipleCard
                eyebrow="Residential"
                title="Owner-directed growth objective"
              >
                A promotion, referral push, service priority, educational need,
                manufacturer offer, or other residential objective can enter the
                same review-and-execution lifecycle.
              </PrincipleCard>

              <PrincipleCard
                eyebrow="Commercial"
                title="Structured commercial pursuit"
              >
                A business can pursue an account, property, facility, or
                organization through a commercial path designed around that
                objective rather than forcing it into the residential ranking
                engine.
              </PrincipleCard>
            </div>
          </div>

          <div className="lg:pt-28">
            <ProductProofFrame>
              <Image
                src="/marketforge-demo-request-action.png"
                alt="Summit Heating & Air example workspace showing the Residential and Commercial Request an Action choices"
                width={1208}
                height={584}
                className="h-auto w-full"
                sizes="(min-width: 1024px) 52vw, 100vw"
              />
            </ProductProofFrame>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.035] p-6">
          <p className="text-lg font-medium leading-8 text-white/88">
            Different objective. Different execution. Same
            review-and-execution lifecycle.
          </p>
        </div>
      </PublicSection>

      {/* Commercial */}
      <PublicSection contentClassName="max-w-6xl">
        <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-center lg:gap-14">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
              Commercial execution
            </div>

            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Commercial objectives become structured pursuits.
            </h2>

            <p className="mt-5 text-base leading-7 text-white/68 sm:text-lg sm:leading-8">
              A commercial request is not treated like another residential
              promotion. MarketForge structures the target account, expected
              outcome, next step, relevant services, and pursuit context around
              the objective the business introduced.
            </p>

            <p className="mt-5 text-base leading-7 text-white/82">
              Commercial work enters through Request an Action rather than
              being ranked inside the residential opportunity engine.
            </p>
          </div>

          <ProductProofFrame>
            <Image
              src="/marketforge-demo-commercial-review.png"
              alt="Summit Heating & Air example commercial pursuit for a property management account"
              width={483}
              height={252}
              className="h-auto w-full"
            />
          </ProductProofFrame>
        </div>
      </PublicSection>

      {/* Execution assets */}
      <PublicSection
        className="border-y border-white/10 bg-white/[0.02]"
        contentClassName="max-w-6xl"
      >
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-14">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
              From decision to execution
            </div>

            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              The recommendation becomes real work.
            </h2>

            <p className="mt-5 text-base leading-7 text-white/68 sm:text-lg sm:leading-8">
              Once an action is selected, MarketForge moves beyond the
              recommendation itself. The business can review the execution
              package, approve what should move forward, and keep the original
              objective connected to the work that will actually go live.
            </p>
          </div>

          <ProductProofFrame>
            <Image
              src="/marketforge-demo-review-action.png"
              alt="Summit Heating & Air example action review showing execution assets ready for approval"
              width={314}
              height={534}
              className="mx-auto h-auto w-full max-w-[390px]"
            />
          </ProductProofFrame>
        </div>
      </PublicSection>

      {/* Execution lifecycle */}
      <PublicSection contentClassName="max-w-6xl">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
            Execution
          </div>

          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            The recommendation does not disappear after the decision.
          </h2>

          <p className="mt-5 text-base leading-7 text-white/68 sm:text-lg sm:leading-8">
            Chosen work remains visible as it moves through the execution
            lifecycle. The business can see what has been approved, what is
            queued or scheduled, what is live, and what has been completed.
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-4">
          {[
            "Approved",
            "Queued / Scheduled",
            "Launched",
            "Completed",
          ].map((status, index) => (
            <div
              key={status}
              className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"
            >
              <div className="text-xs font-semibold text-cyan-300/70">
                {String(index + 1).padStart(2, "0")}
              </div>

              <div className="mt-2 text-sm font-semibold text-white/85">
                {status}
              </div>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-10 max-w-[620px]">
          <ProductProofFrame>
            <Image
              src="/marketforge-demo-execution.png"
              alt="Summit Heating & Air example execution board showing Approved, Queued, Launched, and Completed actions"
              width={518}
              height={252}
              className="mx-auto h-auto w-full max-w-[518px]"
            />
          </ProductProofFrame>

          <p className="mx-auto mt-7 max-w-xl text-center text-lg font-medium leading-8 text-white/88">
            {MARKETFORGE_TERMINOLOGY.executionDoctrine}
          </p>
        </div>
      </PublicSection>

      {/* Measurement */}
      <PublicSection
        className="border-y border-white/10 bg-white/[0.02]"
        contentClassName="max-w-6xl"
      >
        <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-center lg:gap-14">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
              Measurement
            </div>

            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Business outcomes close the loop.
            </h2>

            <p className="mt-5 text-base leading-7 text-white/68 sm:text-lg sm:leading-8">
              MarketForge keeps action-level outcomes visible in business
              terms: leads, booked jobs, booked revenue, and the execution
              context surrounding them.
            </p>

            <div className="mt-7 grid grid-cols-3 gap-3">
              {["Leads", "Booked jobs", "Booked revenue"].map(
                (outcome) => (
                  <div
                    key={outcome}
                    className="rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-4 text-center text-xs font-semibold text-white/80 sm:text-sm"
                  >
                    {outcome}
                  </div>
                ),
              )}
            </div>
          </div>

          <ProductProofFrame>
            <Image
              src="/marketforge-demo-reports.png"
              alt="Summit Heating & Air example reporting view showing leads, booked jobs, revenue, and action performance"
              width={502}
              height={252}
              className="h-auto w-full"
            />
          </ProductProofFrame>
        </div>

        <p className="mt-8 max-w-3xl text-base leading-7 text-white/62">
          Results provide additional evidence for what deserves attention next.
          They do not create false certainty or automatically force the system
          to repeat whatever happened previously.
        </p>
      </PublicSection>

      {/* Close */}
      <PublicSection contentClassName="max-w-5xl">
        <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-8">
          <h2 className="text-3xl font-semibold tracking-tight text-white">
            One operating lifecycle. Less burden on the business.
          </h2>

          <p className="mt-5 max-w-3xl text-base leading-7 text-white/68">
            MarketForge connects business context, recommendations, owner
            choice, owner-directed objectives, execution, and outcomes instead
            of leaving the owner to coordinate those pieces independently.
          </p>
        </div>
      </PublicSection>
    </PublicSiteShell>
  );
}