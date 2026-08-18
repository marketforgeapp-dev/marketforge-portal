import {
  ArticleCallout,
  ArticleSection,
  ArticleTakeaway,
} from "@/components/public-site/knowledge/article-content";
import { ShortAnswer } from "@/components/public-site/knowledge/short-answer";

export default function HowToMeasureAGrowthActionArticle() {
  return (
    <>
      <div className="mt-8">
        <ShortAnswer>
          <p>
            Measure a growth action by connecting it as closely as practical to
            business outcomes such as leads, booked jobs, and booked revenue.
            Use the evidence to improve future decisions without pretending
            every outcome can be attributed with perfect precision.
          </p>
        </ShortAnswer>
      </div>

      <ArticleSection title="Activity is not the same as a business result">
        <p>
          Impressions, clicks, visits, opens, and other activity measures can
          help explain what happened during execution.
        </p>

        <p>
          They do not answer the most important question: did the action create
          a meaningful result for the business?
        </p>
      </ArticleSection>

      <ArticleSection title="Start with outcomes the business understands">
        <p>
          For many local service businesses, useful outcome measures include
          leads, booked jobs, and booked revenue.
        </p>

        <p>
          Those measures connect the growth work to the operating reality of
          the business more directly than channel activity alone.
        </p>
      </ArticleSection>

      <ArticleSection title="Different actions can require different evidence">
        <p>
          Not every growth action produces the same type of result on the same
          timeline.
        </p>

        <p>
          A direct-response action may create identifiable leads quickly. A
          reputation, visibility, or authority-building action may influence
          outcomes over a longer period and be harder to isolate.
        </p>
      </ArticleSection>

      <ArticleCallout>
        Measure what can be measured clearly without manufacturing precision
        that the available evidence cannot support.
      </ArticleCallout>

      <ArticleSection title="Perfect attribution is not required for useful learning">
        <p>
          Customer decisions are often influenced by multiple interactions.
          Offline conversations, referrals, search behavior, reputation, prior
          awareness, and direct growth activity can overlap.
        </p>

        <p>
          Measurement should therefore be disciplined without claiming more
          certainty than the data provides.
        </p>
      </ArticleSection>

      <ArticleSection title="Use outcomes as future context">
        <p>
          Results should inform future recommendations. If a particular type of
          opportunity repeatedly creates valuable work, that evidence matters.
        </p>

        <p>
          But previous performance is one input among many. Changes in
          seasonality, capacity, economics, competition, or business priorities
          may justify a different decision next time.
        </p>
      </ArticleSection>

      <ArticleTakeaway>
        Measure growth in business terms wherever possible. Use leads, booked
        jobs, booked revenue, and other credible evidence to learn—without
        turning imperfect attribution into false certainty.
      </ArticleTakeaway>
    </>
  );
}