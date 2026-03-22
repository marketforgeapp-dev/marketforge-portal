import {
  type CompetitorCandidate,
  type DiscoverCompetitorsInput,
  discoverLocalCompetitorsCore,
  lookupSingleCompetitorCore,
} from "@/lib/google-places-competitor-core";

export type { CompetitorCandidate };

export async function discoverLocalCompetitors(
  input: DiscoverCompetitorsInput
): Promise<CompetitorCandidate[]> {
  return discoverLocalCompetitorsCore(input);
}

export async function lookupSingleCompetitor(input: {
  companyName: string;
  industry: "PLUMBING" | "HVAC" | "SEPTIC" | "TREE_SERVICE";
  city?: string | null;
  state?: string | null;
  website?: string | null;
}): Promise<CompetitorCandidate | null> {
  return lookupSingleCompetitorCore(input);
}