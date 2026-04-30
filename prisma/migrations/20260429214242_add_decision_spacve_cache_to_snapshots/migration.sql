-- AlterTable
ALTER TABLE "public"."WorkspaceOpportunitySnapshot" ADD COLUMN     "aiCandidatePoolJson" JSONB,
ADD COLUMN     "availableJobsEstimate" INTEGER,
ADD COLUMN     "decisionSpaceGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "decisionSpaceJson" JSONB;
