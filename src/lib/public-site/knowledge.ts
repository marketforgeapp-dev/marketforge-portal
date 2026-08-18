import type { ComponentType } from "react";

export type KnowledgePillar =
  | "Revenue Operating Systems"
  | "Growth Strategy"
  | "Opportunity Selection"
  | "Execution"
  | "Business Outcomes";

export type KnowledgeArticleStatus = "draft" | "published";

export type KnowledgeArticle = {
  slug: string;
  title: string;
  question: string;
  description: string;
  pillar: KnowledgePillar;
  status: KnowledgeArticleStatus;
  publishedAt: string;
  reviewedAt?: string;
  author: {
    name: string;
    role: string;
  };
  relatedSlugs: string[];
  component: ComponentType;
};

export const KNOWLEDGE_PILLAR_ORDER: KnowledgePillar[] = [
  "Revenue Operating Systems",
  "Opportunity Selection",
  "Growth Strategy",
  "Execution",
  "Business Outcomes",
];