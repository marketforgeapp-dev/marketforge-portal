import {
  ArticleCallout,
  ArticleSection,
  ArticleTakeaway,
} from "@/components/public-site/knowledge/article-content";
import { ShortAnswer } from "@/components/public-site/knowledge/short-answer";
import { MARKETFORGE_TERMINOLOGY } from "@/lib/public-site/terminology";

export default function WhatIsAGrowthExecutionPlatformArticle() {
  return (
    <>
      <div className="mt-8">
        <ShortAnswer>
          <p>
            A Growth Execution Platform helps a business connect growth
            decisions to execution. MarketForge does this by using business
            context to identify worthwhile opportunities, recommend what
            deserves attention, preserve business choice, turn selected
            opportunities into executable work, and keep business outcomes
            visible so they can inform what happens next.
          </p>
        </ShortAnswer>
      </div>

      <ArticleSection title="Why does a business need a continuous growth function?">
        <p>
          Growth creates a recurring set of decisions. A business has to
          understand what is happening, identify opportunities, decide what
          deserves attention, turn that decision into action, and determine
          whether the work produced a meaningful business result.
        </p>

        <p>
          Those responsibilities exist whether the business handles them
          deliberately or not. The problem is that they are often spread across
          disconnected tools, vendors, activities, and owner decisions instead
          of being managed as one continuous business function.
        </p>
      </ArticleSection>

      <ArticleSection title="A Growth Execution Platform helps operationalize the whole growth process">
        <div className="grid gap-3 sm:grid-cols-5">
          {[
            "Identify",
            "Recommend",
            "Choose",
            "Execute",
            "Measure",
          ].map((step, index) => (
            <div
              key={step}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-center"
            >
              <div className="text-xs font-semibold text-cyan-300/75">
                {String(index + 1).padStart(2, "0")}
              </div>

              <div className="mt-2 text-sm font-semibold text-white/85">
                {step}
              </div>
            </div>
          ))}
        </div>

        <p>
          The value is not any one step by itself. The value comes from
          connecting the steps so that business context influences the
          recommendation, the recommendation leads to execution, and the
          resulting outcomes become context for the next decision.
        </p>
      </ArticleSection>

      <ArticleSection title="It starts with the opportunity, not the activity">
        <p>
          Many growth approaches begin by choosing an activity: run an ad,
          publish content, send an email, launch a promotion, or use a
          particular channel.
        </p>

        <p>
          MarketForge reverses that order. It starts by asking what business
          opportunity is worth pursuing under current conditions. The execution
          method follows from that objective.
        </p>

        <ArticleCallout>
          {MARKETFORGE_TERMINOLOGY.opportunityDoctrine}
        </ArticleCallout>

        <p>
          That distinction matters because the same activity can be useful for
          one objective and irrelevant for another. Execution should serve the
          business opportunity rather than become the objective itself.
        </p>
      </ArticleSection>

      <ArticleSection title="The recommendation does not replace business judgment">
        <p>
          A useful Growth Execution Platform should narrow the decision space
          and make the strongest recommendation visible without pretending it
          knows every piece of context the owner knows.
        </p>

        <ArticleCallout>
          {MARKETFORGE_TERMINOLOGY.recommendationDoctrine}
        </ArticleCallout>

        <p>
          That means creating focus while preserving meaningful alternatives.
          A recommendation is valuable because it helps the business decide
          what deserves attention first, not because it removes the business
          from the decision.
        </p>
      </ArticleSection>

      <ArticleSection title="Execution is part of the platform's job">
        <p>
          Identifying a good opportunity does not create a business result.
          Something still has to happen.
        </p>

        <p>
          The chosen opportunity needs to become executable work, move through
          an approval and launch process where appropriate, and remain visible
          after the decision is made.
        </p>

        <p>
          Separating recommendation from execution leaves the business with
          another handoff to manage. A Growth Execution Platform should reduce
          that burden by connecting the decision to the work that follows.
        </p>
      </ArticleSection>

      <ArticleSection title="Business outcomes close the loop">
        <p>
          The growth process should ultimately care about business outcomes
          rather than activity for its own sake.
        </p>

        <p>
          For a local service business, that commonly means understanding what
          happened in terms of leads, booked jobs, and booked revenue where
          those outcomes can be measured.
        </p>

        <p>
          Those results become additional context for future decisions. They
          should influence what happens next without creating false certainty
          that yesterday&apos;s best action must automatically remain
          tomorrow&apos;s best action.
        </p>
      </ArticleSection>

      <ArticleSection title="What makes MarketForge a Growth Execution Platform?">
        <p>
          MarketForge is built around a continuous growth operating model for
          local service businesses. It evaluates business context, surfaces
          growth opportunities, recommends what deserves attention, preserves
          owner choice, helps turn selected opportunities or owner-directed
          objectives into executable actions, and keeps resulting business
          outcomes visible.
        </p>

        <p>
          The product is not defined by one channel or one growth tactic. The
          objective determines the execution.
        </p>
      </ArticleSection>

      <ArticleTakeaway>
        A business does not need another disconnected growth activity. It needs
        a repeatable way to decide what deserves attention, turn that decision
        into action, understand what happened, and use that context to decide
        what comes next.
      </ArticleTakeaway>
    </>
  );
}