import {
  ArticleCallout,
  ArticleSection,
  ArticleTakeaway,
} from "@/components/public-site/knowledge/article-content";
import { ShortAnswer } from "@/components/public-site/knowledge/short-answer";
import { MARKETFORGE_TERMINOLOGY } from "@/lib/public-site/terminology";

export default function WhyGrowthRecommendationsNeedOptionsArticle() {
  return (
    <>
      <div className="mt-8">
        <ShortAnswer>
          <p>
            A strong growth recommendation should create focus without
            pretending the system knows every piece of context the business
            owner knows. A clear top recommendation and a small set of strong
            alternatives can support better judgment than a single forced
            choice.
          </p>
        </ShortAnswer>
      </div>

      <ArticleSection title="A recommendation should narrow the decision">
        <p>
          A useful recommendation reduces noise. It should make clear what
          appears to deserve attention first rather than handing the business a
          long undifferentiated list of ideas.
        </p>

        <p>
          But narrowing the decision does not require pretending there is only
          one reasonable answer.
        </p>
      </ArticleSection>

      <ArticleCallout>
        {MARKETFORGE_TERMINOLOGY.recommendationDoctrine}
      </ArticleCallout>

      <ArticleSection title="The owner knows things the system may not">
        <p>
          A business owner may know that a technician is about to leave, a
          supplier relationship is changing, a large job is likely to close, a
          service line has operational problems, or a particular opportunity is
          strategically important.
        </p>

        <p>
          Not every piece of real-world context will always be captured in the
          system at the exact moment a recommendation is made.
        </p>
      </ArticleSection>

      <ArticleSection title="Options preserve judgment without creating chaos">
        <p>
          There is a meaningful difference between offering alternatives and
          avoiding a recommendation.
        </p>

        <p>
          The system can still identify a top priority while keeping a limited
          number of worthwhile alternatives visible. That creates direction
          without unnecessary rigidity.
        </p>
      </ArticleSection>

      <ArticleSection title="Too many options create a different problem">
        <p>
          Optionality loses its value when every possible idea is presented as
          equally important.
        </p>

        <p>
          The purpose is not to give the business an endless menu. It is to
          preserve a small, useful decision space around the strongest
          opportunities.
        </p>
      </ArticleSection>

      <ArticleSection title="Recommendation and choice can coexist">
        <p>
          The system should do the work of analyzing and prioritizing. The
          business should retain the ability to choose based on additional
          context and judgment.
        </p>

        <p>
          Those responsibilities reinforce each other rather than compete.
        </p>
      </ArticleSection>

      <ArticleTakeaway>
        A clear recommendation does not have to mean a single choice. Good
        recommendations create focus while preserving enough optionality for
        informed business judgment.
      </ArticleTakeaway>
    </>
  );
}