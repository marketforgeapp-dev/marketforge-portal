-- AlterTable
ALTER TABLE "public"."BusinessProfile" ADD COLUMN     "googlePlaceId" TEXT,
ADD COLUMN     "googleRating" DOUBLE PRECISION,
ADD COLUMN     "googleReviewCount" INTEGER,
ADD COLUMN     "lastReputationEnrichedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."Competitor" ADD COLUMN     "googlePlaceId" TEXT,
ADD COLUMN     "lastEnrichedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."Workspace" ADD COLUMN     "lastCompetitorRefreshAt" TIMESTAMP(3),
ADD COLUMN     "lastReputationRefreshAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."BusinessReputationSnapshot" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "businessProfileId" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rating" DOUBLE PRECISION,
    "reviewCount" INTEGER,

    CONSTRAINT "BusinessReputationSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CompetitorMetricsSnapshot" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "competitorId" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rating" DOUBLE PRECISION,
    "reviewCount" INTEGER,

    CONSTRAINT "CompetitorMetricsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusinessReputationSnapshot_workspaceId_capturedAt_idx" ON "public"."BusinessReputationSnapshot"("workspaceId", "capturedAt");

-- CreateIndex
CREATE INDEX "BusinessReputationSnapshot_businessProfileId_capturedAt_idx" ON "public"."BusinessReputationSnapshot"("businessProfileId", "capturedAt");

-- CreateIndex
CREATE INDEX "CompetitorMetricsSnapshot_workspaceId_capturedAt_idx" ON "public"."CompetitorMetricsSnapshot"("workspaceId", "capturedAt");

-- CreateIndex
CREATE INDEX "CompetitorMetricsSnapshot_competitorId_capturedAt_idx" ON "public"."CompetitorMetricsSnapshot"("competitorId", "capturedAt");

-- AddForeignKey
ALTER TABLE "public"."BusinessReputationSnapshot" ADD CONSTRAINT "BusinessReputationSnapshot_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BusinessReputationSnapshot" ADD CONSTRAINT "BusinessReputationSnapshot_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "public"."BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompetitorMetricsSnapshot" ADD CONSTRAINT "CompetitorMetricsSnapshot_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompetitorMetricsSnapshot" ADD CONSTRAINT "CompetitorMetricsSnapshot_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "public"."Competitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
