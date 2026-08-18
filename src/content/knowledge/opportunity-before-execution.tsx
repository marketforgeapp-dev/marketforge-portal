import {
  ArticleCallout,
  ArticleSection,
  ArticleTakeaway,
} from "@/components/public-site/knowledge/article-content";
import { ShortAnswer } from "@/components/public-site/knowledge/short-answer";
import { MARKETFORGE_TERMINOLOGY } from "@/lib/public-site/terminology";

export default function OpportunityBeforeExecutionArticle() {
  return (
    <>
      <div className="mt-8">
        <ShortAnswer>
          <p>
            Start with the growth opportunity before choosing how to execute it.
            The business objective should determine the activity, channel, or
            execution method—not the other way around.
          </p>
        </ShortAnswer>
      </div>

      <ArticleSection title="Tactics are means, not objectives">
        <p>
          Running an ad, publishing an article, launching an offer, requesting
          referrals, or contacting a commercial account can all be useful
          activities.
        </p>

        <p>
          None of them explains why the business should act.
        </p>

        <p>
          A useful growth decision starts by defining the opportunity the
          business wants to pursue and then choosing an execution method that
          serves that objective.
        </p>
      </ArticleSection>

      <ArticleSection title="Tactic-first planning reverses the decision">
        <p>
          When the process begins with a channel or activity, the business is
          forced to find a reason to use the tactic it already selected.
        </p>

        <p>
          That can create activity without creating meaningful progress toward
          the business&apos;s actual objective.
        </p>

        <ArticleCallout>
          {MARKETFORGE_TERMINOLOGY.opportunityDoctrine}
        </ArticleCallout>
      </ArticleSection>

      <ArticleSection title="The same opportunity can require different execution">
        <p>
          Two businesses may pursue the same broad objective but need very
          different execution because their markets, customer relationships,
          reputation, budgets, capacity, and service economics differ.
        </p>

        <p>
          Likewise, the same execution method can serve completely different
          objectives depending on how it is used.
        </p>
      </ArticleSection>

      <ArticleSection title="The objective creates a better decision boundary">
        <p>
          Starting with the opportunity gives the business a way to judge
          whether an execution idea belongs.
        </p>

        <p>
          If an activity does not materially help pursue the selected
          opportunity, there is little reason to prioritize it simply because
          it is familiar or available.
        </p>
      </ArticleSection>

      <ArticleSection title="Execution still matters">
        <p>
          Opportunity-first thinking does not make execution less important.
          It makes execution more purposeful.
        </p>

        <p>
          Once the business chooses an opportunity, the next responsibility is
          to turn it into clear, executable work and carry that work through to
          completion.
        </p>
      </ArticleSection>

      <ArticleTakeaway>
        Decide what the business is trying to accomplish before deciding what
        activity to run. The objective should determine the execution.
      </ArticleTakeaway>
    </>
  );
}