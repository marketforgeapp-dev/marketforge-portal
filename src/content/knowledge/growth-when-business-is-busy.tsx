import {
  ArticleCallout,
  ArticleSection,
  ArticleTakeaway,
} from "@/components/public-site/knowledge/article-content";
import { ShortAnswer } from "@/components/public-site/knowledge/short-answer";

export default function GrowthWhenBusinessIsBusyArticle() {
  return (
    <>
      <div className="mt-8">
        <ShortAnswer>
          <p>
            A busy business should not automatically stop thinking about
            growth. The growth objective may change when capacity is tight, but
            keeping growth intentional helps the business protect future demand
            instead of restarting from zero when conditions change.
          </p>
        </ShortAnswer>
      </div>

      <ArticleSection title="Being busy changes the problem">
        <p>
          When demand is strong and the schedule is full, generating more
          immediate work may no longer be the highest-value objective.
        </p>

        <p>
          That does not mean the growth function disappears. It means the
          business should adjust what growth is supposed to accomplish.
        </p>
      </ArticleSection>

      <ArticleSection title="Capacity should influence the objective">
        <p>
          A business near capacity may appropriately reduce activity designed
          to produce immediate volume and shift attention toward work that
          strengthens its future position.
        </p>

        <p>
          That could include protecting visibility, improving reputation,
          strengthening valuable service areas, preparing for slower periods,
          or pursuing opportunities with better economics rather than simply
          more volume.
        </p>
      </ArticleSection>

      <ArticleCallout>
        Growth should respond to business conditions, not disappear whenever
        the business gets busy.
      </ArticleCallout>

      <ArticleSection title="Stopping completely can create a delayed problem">
        <p>
          Many growth activities have lag. Work done today may influence demand
          weeks or months later.
        </p>

        <p>
          If a business completely stops maintaining its growth position during
          busy periods, the effect may become visible only after the schedule
          has already started to soften.
        </p>
      </ArticleSection>

      <ArticleSection title="Growth can mean improving the work, not adding more of it">
        <p>
          More jobs are not always the immediate objective. A busy business may
          benefit more from improving job mix, prioritizing stronger services,
          pursuing higher-value opportunities, or strengthening future demand
          before capacity opens again.
        </p>
      </ArticleSection>

      <ArticleSection title="The goal is intentional continuity">
        <p>
          Growth should be managed as an ongoing business responsibility whose
          objective adapts to current conditions.
        </p>

        <p>
          The business can slow, redirect, or change the work without abandoning
          the responsibility entirely.
        </p>
      </ArticleSection>

      <ArticleTakeaway>
        When the business is busy, change the growth objective instead of
        automatically turning growth off. Capacity is context for the decision,
        not a reason to stop making one.
      </ArticleTakeaway>
    </>
  );
}