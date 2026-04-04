import {
  type CompetitorCandidate,
  type DiscoverCompetitorsInput,
  type LookupBusinessInput,
  discoverLocalCompetitorsCore,
  lookupBusinessCandidatesCore,
  lookupSingleCompetitorCore,
} from "@/lib/google-places-competitor-core";

export type { CompetitorCandidate };

export async function discoverLocalCompetitors(
  input: DiscoverCompetitorsInput
): Promise<CompetitorCandidate[]> {
  return discoverLocalCompetitorsCore(input);
}

export async function lookupBusinessCandidates(
  input: LookupBusinessInput
): Promise<CompetitorCandidate[]> {
  return lookupBusinessCandidatesCore(input);
}

export async function lookupSingleCompetitor(
  input: LookupBusinessInput
): Promise<CompetitorCandidate | null> {
  return lookupSingleCompetitorCore(input);
}