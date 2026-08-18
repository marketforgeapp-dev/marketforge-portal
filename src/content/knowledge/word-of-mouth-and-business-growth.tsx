import {
  ArticleCallout,
  ArticleSection,
  ArticleTakeaway,
} from "@/components/public-site/knowledge/article-content";
import { ShortAnswer } from "@/components/public-site/knowledge/short-answer";

export default function WordOfMouthAndBusinessGrowthArticle() {
  return (
    <>
      <div className="mt-8">
        <ShortAnswer>
          <p>
            Word of mouth is a valuable growth asset because it reflects trust
            and customer satisfaction. A business should protect and strengthen
            it, but relying on referrals alone leaves future growth dependent on
            a source of demand the business does not fully control.
          </p>
        </ShortAnswer>
      </div>

      <ArticleSection title="Strong word of mouth is a business strength">
        <p>
          Customers who recommend a business to friends, neighbors, coworkers,
          or other companies are creating real economic value.
        </p>

        <p>
          That trust is earned and should be treated as an asset rather than
          dismissed simply because it is not generated through a formal growth
          activity.
        </p>
      </ArticleSection>

      <ArticleSection title="The limitation is control">
        <p>
          A business cannot fully determine when a past customer will make a
          recommendation, who will receive it, what service that person needs,
          or when the resulting demand will arrive.
        </p>

        <p>
          That makes referrals valuable but inherently less controllable than
          an intentional growth process.
        </p>
      </ArticleSection>

      <ArticleCallout>
        Protect word of mouth. Do not make the entire future of the business
        depend on it happening often enough.
      </ArticleCallout>

      <ArticleSection title="Intentional growth does not replace referrals">
        <p>
          The choice is not between word of mouth and a structured growth
          process.
        </p>

        <p>
          A strong business can benefit from both: preserve the reputation and
          customer experience that create referrals while also taking
          deliberate responsibility for future growth.
        </p>
      </ArticleSection>

      <ArticleSection title="Referral activity can sometimes be strengthened">
        <p>
          Businesses can make it easier for satisfied customers to recommend
          them, ask for reviews, maintain customer relationships, or create a
          structured referral offer when that fits the objective.
        </p>

        <p>
          Those actions can support an existing word-of-mouth advantage without
          assuming referrals alone will produce the amount or type of growth the
          business needs.
        </p>
      </ArticleSection>

      <ArticleSection title="Growth becomes more resilient when it has multiple sources">
        <p>
          A business with intentional ways to create visibility, demand,
          reputation, repeat business, commercial relationships, and referrals
          is less dependent on any single source.
        </p>

        <p>
          That makes growth more manageable without reducing the value of
          customer recommendations.
        </p>
      </ArticleSection>

      <ArticleTakeaway>
        Word of mouth is worth protecting because it reflects earned trust.
        Treat it as a powerful growth asset, not the only mechanism responsible
        for keeping the business growing.
      </ArticleTakeaway>
    </>
  );
}