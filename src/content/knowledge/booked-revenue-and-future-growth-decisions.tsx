import {
  ArticleCallout,
  ArticleSection,
  ArticleTakeaway,
} from "@/components/public-site/knowledge/article-content";
import { ShortAnswer } from "@/components/public-site/knowledge/short-answer";

export default function BookedRevenueAndFutureGrowthDecisionsArticle() {
  return (
    <>
      <div className="mt-8">
        <ShortAnswer>
          <p>
            Booked revenue should inform future growth decisions because it
            shows whether prior actions were connected to valuable business
            outcomes. It should influence the next recommendation without
            automatically dictating what the business must do again.
          </p>
        </ShortAnswer>
      </div>

      <ArticleSection title="Booked revenue connects growth to the business">
        <p>
          Leads show that interest was created. Booked jobs show that interest
          became actual work. Booked revenue adds another layer by showing the
          economic value associated with that work.
        </p>

        <p>
          That makes booked revenue useful context when evaluating what happened
          after a growth action.
        </p>
      </ArticleSection>

      <ArticleSection title="Past outcomes can reveal useful patterns">
        <p>
          Over time, the business may learn that certain services,
          opportunities, audiences, offers, or execution approaches tend to
          produce stronger outcomes.
        </p>

        <p>
          That evidence should improve future decision-making rather than being
          discarded after the action is complete.
        </p>
      </ArticleSection>

      <ArticleCallout>
        Past booked revenue is evidence about what happened before. It is not a
        rule that the same decision must always win next.
      </ArticleCallout>

      <ArticleSection title="Business conditions keep changing">
        <p>
          A previously successful action may become less attractive when
          capacity changes, seasonality shifts, service economics change, a
          different opportunity becomes more urgent, or the market evolves.
        </p>

        <p>
          Historical outcomes therefore belong inside the decision context
          rather than above it.
        </p>
      </ArticleSection>

      <ArticleSection title="Revenue should be interpreted alongside the opportunity">
        <p>
          High booked revenue does not automatically mean an action was the best
          possible decision. Cost, margin, capacity consumed, strategic value,
          and the availability of alternatives still matter.
        </p>
      </ArticleSection>

      <ArticleSection title="The goal is a better next decision">
        <p>
          Measurement becomes most valuable when the business uses what it
          learned.
        </p>

        <p>
          Booked revenue should help refine future recommendations while
          preserving the ability to respond to new conditions.
        </p>
      </ArticleSection>

      <ArticleTakeaway>
        Use booked revenue as evidence, not autopilot. It should improve the
        next growth decision without freezing the business into yesterday&apos;s
        answer.
      </ArticleTakeaway>
    </>
  );
}