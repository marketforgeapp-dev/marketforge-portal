import type { KnowledgeArticle } from "@/lib/public-site/knowledge";

import BookedRevenueAndFutureGrowthDecisionsArticle from "./booked-revenue-and-future-growth-decisions";
import BusinessContextAndGrowthRecommendationsArticle from "./business-context-and-growth-recommendations";
import CompetitorsAndGrowthDecisionsArticle from "./competitors-and-growth-decisions";
import GrowthWhenBusinessIsBusyArticle from "./growth-when-business-is-busy";
import HowToChooseAGrowthOpportunityArticle from "./how-to-choose-a-growth-opportunity";
import HowToMeasureAGrowthActionArticle from "./how-to-measure-a-growth-action";
import OpportunityBeforeExecutionArticle from "./opportunity-before-execution";
import WhatIsARevenueOperatingSystemArticle from "./what-is-a-revenue-operating-system";
import WhyGrowthRecommendationsNeedOptionsArticle from "./why-growth-recommendations-need-options";
import WhyRecommendationsNeedExecutionArticle from "./why-recommendations-need-execution";
import WordOfMouthAndBusinessGrowthArticle from "./word-of-mouth-and-business-growth";

export const KNOWLEDGE_ARTICLES: KnowledgeArticle[] = [
  {
    slug: "what-is-a-revenue-operating-system",
    title: "What Is a Revenue Operating System?",
    question: "What Is a Revenue Operating System?",
    description:
      "A Revenue Operating System connects growth opportunities, recommendations, business choice, execution, and outcomes into one continuous business function.",
    pillar: "Revenue Operating Systems",
    status: "published",
    publishedAt: "2026-08-16",
    reviewedAt: "2026-08-16",
    author: {
      name: "Patrick Donovan",
      role: "Founder, MarketForge",
    },
    relatedSlugs: [
      "opportunity-before-execution",
      "why-recommendations-need-execution",
      "how-to-measure-a-growth-action",
    ],
    component: WhatIsARevenueOperatingSystemArticle,
  },
  {
    slug: "how-to-choose-a-growth-opportunity",
    title: "How Do You Choose a Growth Opportunity?",
    question: "How Do You Choose a Growth Opportunity?",
    description:
      "Choose growth opportunities using business value, urgency, fit, capacity, and alternatives instead of simply pursuing the loudest idea.",
    pillar: "Opportunity Selection",
    status: "published",
    publishedAt: "2026-08-16",
    reviewedAt: "2026-08-16",
    author: {
      name: "Patrick Donovan",
      role: "Founder, MarketForge",
    },
    relatedSlugs: [
      "business-context-and-growth-recommendations",
      "why-growth-recommendations-need-options",
      "opportunity-before-execution",
    ],
    component: HowToChooseAGrowthOpportunityArticle,
  },
  {
    slug: "opportunity-before-execution",
    title: "Why Should the Opportunity Come Before the Execution?",
    question: "Why Should the Opportunity Come Before the Execution?",
    description:
      "The business objective should determine how an opportunity is executed instead of starting with a channel or activity and searching for a reason to use it.",
    pillar: "Opportunity Selection",
    status: "published",
    publishedAt: "2026-08-16",
    reviewedAt: "2026-08-16",
    author: {
      name: "Patrick Donovan",
      role: "Founder, MarketForge",
    },
    relatedSlugs: [
      "how-to-choose-a-growth-opportunity",
      "why-recommendations-need-execution",
      "what-is-a-revenue-operating-system",
    ],
    component: OpportunityBeforeExecutionArticle,
  },
  {
    slug: "growth-when-business-is-busy",
    title: "Should a Business Keep Growing When It Is Already Busy?",
    question: "Should a Business Keep Growing When It Is Already Busy?",
    description:
      "Busy periods should change the growth objective rather than automatically stopping growth responsibility altogether.",
    pillar: "Growth Strategy",
    status: "published",
    publishedAt: "2026-08-16",
    reviewedAt: "2026-08-16",
    author: {
      name: "Patrick Donovan",
      role: "Founder, MarketForge",
    },
    relatedSlugs: [
      "business-context-and-growth-recommendations",
      "how-to-choose-a-growth-opportunity",
      "booked-revenue-and-future-growth-decisions",
    ],
    component: GrowthWhenBusinessIsBusyArticle,
  },
  {
    slug: "why-growth-recommendations-need-options",
    title: "Why Should Growth Recommendations Include Options?",
    question: "Why Should Growth Recommendations Include Options?",
    description:
      "Strong recommendations create focus while preserving enough optionality for business judgment and context the system may not know.",
    pillar: "Opportunity Selection",
    status: "published",
    publishedAt: "2026-08-16",
    reviewedAt: "2026-08-16",
    author: {
      name: "Patrick Donovan",
      role: "Founder, MarketForge",
    },
    relatedSlugs: [
      "how-to-choose-a-growth-opportunity",
      "business-context-and-growth-recommendations",
      "what-is-a-revenue-operating-system",
    ],
    component: WhyGrowthRecommendationsNeedOptionsArticle,
  },
  {
    slug: "business-context-and-growth-recommendations",
    title: "Why Does Business Context Matter for Growth Recommendations?",
    question: "Why Does Business Context Matter for Growth Recommendations?",
    description:
      "Services, economics, capacity, priorities, seasonality, reputation, and market conditions all change which growth opportunities deserve attention.",
    pillar: "Growth Strategy",
    status: "published",
    publishedAt: "2026-08-16",
    reviewedAt: "2026-08-16",
    author: {
      name: "Patrick Donovan",
      role: "Founder, MarketForge",
    },
    relatedSlugs: [
      "how-to-choose-a-growth-opportunity",
      "growth-when-business-is-busy",
      "why-growth-recommendations-need-options",
    ],
    component: BusinessContextAndGrowthRecommendationsArticle,
  },
  {
    slug: "why-recommendations-need-execution",
    title: "Why Do Growth Recommendations Need Execution?",
    question: "Why Do Growth Recommendations Need Execution?",
    description:
      "Recommendations are incomplete when the business is still responsible for translating the decision into all of the work required to execute it.",
    pillar: "Execution",
    status: "published",
    publishedAt: "2026-08-16",
    reviewedAt: "2026-08-16",
    author: {
      name: "Patrick Donovan",
      role: "Founder, MarketForge",
    },
    relatedSlugs: [
      "opportunity-before-execution",
      "how-to-measure-a-growth-action",
      "what-is-a-revenue-operating-system",
    ],
    component: WhyRecommendationsNeedExecutionArticle,
  },
  {
    slug: "how-to-measure-a-growth-action",
    title: "How Should a Business Measure a Growth Action?",
    question: "How Should a Business Measure a Growth Action?",
    description:
      "Measure growth actions using credible business outcomes such as leads, booked jobs, and booked revenue without manufacturing false attribution precision.",
    pillar: "Business Outcomes",
    status: "published",
    publishedAt: "2026-08-16",
    reviewedAt: "2026-08-16",
    author: {
      name: "Patrick Donovan",
      role: "Founder, MarketForge",
    },
    relatedSlugs: [
      "booked-revenue-and-future-growth-decisions",
      "why-recommendations-need-execution",
      "what-is-a-revenue-operating-system",
    ],
    component: HowToMeasureAGrowthActionArticle,
  },
  {
    slug: "competitors-and-growth-decisions",
    title: "How Should Competitors Influence Growth Decisions?",
    question: "How Should Competitors Influence Growth Decisions?",
    description:
      "Competitor information should provide market context and reveal useful signals without becoming instructions to copy another business.",
    pillar: "Growth Strategy",
    status: "published",
    publishedAt: "2026-08-16",
    reviewedAt: "2026-08-16",
    author: {
      name: "Patrick Donovan",
      role: "Founder, MarketForge",
    },
    relatedSlugs: [
      "business-context-and-growth-recommendations",
      "how-to-choose-a-growth-opportunity",
      "opportunity-before-execution",
    ],
    component: CompetitorsAndGrowthDecisionsArticle,
  },
  {
    slug: "booked-revenue-and-future-growth-decisions",
    title: "How Should Booked Revenue Influence Future Growth Decisions?",
    question: "How Should Booked Revenue Influence Future Growth Decisions?",
    description:
      "Booked revenue provides evidence about previous growth outcomes and should inform future recommendations without automatically dictating them.",
    pillar: "Business Outcomes",
    status: "published",
    publishedAt: "2026-08-16",
    reviewedAt: "2026-08-16",
    author: {
      name: "Patrick Donovan",
      role: "Founder, MarketForge",
    },
    relatedSlugs: [
      "how-to-measure-a-growth-action",
      "business-context-and-growth-recommendations",
      "growth-when-business-is-busy",
    ],
    component: BookedRevenueAndFutureGrowthDecisionsArticle,
  },
  {
    slug: "word-of-mouth-and-business-growth",
    title: "Is Word of Mouth Enough to Grow a Business?",
    question: "Is Word of Mouth Enough to Grow a Business?",
    description:
      "Word of mouth is an important growth asset, but relying on referrals alone leaves future growth dependent on demand the business does not fully control.",
    pillar: "Growth Strategy",
    status: "published",
    publishedAt: "2026-08-16",
    reviewedAt: "2026-08-16",
    author: {
      name: "Patrick Donovan",
      role: "Founder, MarketForge",
    },
    relatedSlugs: [
      "growth-when-business-is-busy",
      "how-to-choose-a-growth-opportunity",
      "business-context-and-growth-recommendations",
    ],
    component: WordOfMouthAndBusinessGrowthArticle,
  },
];

export function getPublishedKnowledgeArticles() {
  return KNOWLEDGE_ARTICLES.filter(
    (article) => article.status === "published",
  );
}

export function getKnowledgeArticleBySlug(slug: string) {
  return getPublishedKnowledgeArticles().find(
    (article) => article.slug === slug,
  );
}

export function getRelatedKnowledgeArticles(
  article: KnowledgeArticle,
) {
  if (article.relatedSlugs.length === 0) {
    return [];
  }

  const publishedArticles = getPublishedKnowledgeArticles();

  return article.relatedSlugs
    .map((slug) =>
      publishedArticles.find(
        (candidate) => candidate.slug === slug,
      ),
    )
    .filter(
      (candidate): candidate is KnowledgeArticle =>
        Boolean(candidate),
    );
}