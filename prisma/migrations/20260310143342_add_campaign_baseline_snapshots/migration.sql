-- CreateTable
CREATE TABLE "CampaignBaselineSnapshot" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "estimatedWeeklyRevenue" DECIMAL(10,2),
    "estimatedBookedJobs" INTEGER,
    "activeOpportunityCount" INTEGER,
    "aeoReadinessScore" INTEGER,
    "opportunitySummary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignBaselineSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CampaignBaselineSnapshot_campaignId_key" ON "CampaignBaselineSnapshot"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignBaselineSnapshot_workspaceId_idx" ON "CampaignBaselineSnapshot"("workspaceId");

-- CreateIndex
CREATE INDEX "CampaignBaselineSnapshot_campaignId_idx" ON "CampaignBaselineSnapshot"("campaignId");

-- AddForeignKey
ALTER TABLE "CampaignBaselineSnapshot" ADD CONSTRAINT "CampaignBaselineSnapshot_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignBaselineSnapshot" ADD CONSTRAINT "CampaignBaselineSnapshot_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
