-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "IndustryType" AS ENUM ('PLUMBING', 'HVAC', 'SEPTIC', 'TREE_SERVICE');

-- CreateEnum
CREATE TYPE "BrandTone" AS ENUM ('PROFESSIONAL', 'FRIENDLY', 'URGENT', 'LOCAL');

-- CreateEnum
CREATE TYPE "OpportunityType" AS ENUM ('SEASONAL_DEMAND', 'COMPETITOR_INACTIVE', 'CAPACITY_GAP', 'HIGH_VALUE_SERVICE', 'AI_SEARCH_VISIBILITY', 'REVIEW_SENTIMENT_SHIFT', 'LOCAL_SEARCH_SPIKE');

-- CreateEnum
CREATE TYPE "CampaignType" AS ENUM ('DRAIN_SPECIAL', 'WATER_HEATER', 'MAINTENANCE_PUSH', 'REVIEW_GENERATION', 'EMERGENCY_SERVICE', 'SEO_CONTENT', 'AEO_FAQ', 'CUSTOM');

-- CreateEnum
CREATE TYPE "CampaignObjective" AS ENUM ('FILL_OPEN_SCHEDULE', 'PUSH_HIGHER_TICKET_JOBS', 'DEFEND_AGAINST_COMPETITOR', 'IMPROVE_AI_SEARCH_VISIBILITY', 'INCREASE_REVIEWS', 'CAPTURE_SEASONAL_DEMAND');

-- CreateEnum
CREATE TYPE "CapacityFit" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "ConfidenceLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('COMPETITOR_PROMO', 'COMPETITOR_INACTIVE', 'SEARCH_DEMAND_SPIKE', 'REVIEW_CHANGE', 'AEO_OPPORTUNITY', 'UNDERUTILIZED_SCHEDULE', 'SEASONAL_SHIFT');

-- CreateEnum
CREATE TYPE "AlertSource" AS ENUM ('COMPETITOR', 'DEMAND_MODEL', 'AEO_MODEL', 'CAPACITY_MODEL', 'MANUAL');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'READY', 'APPROVED', 'SCHEDULED', 'LAUNCHED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'NEEDS_REVISION');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('GOOGLE_BUSINESS', 'META', 'GOOGLE_ADS', 'EMAIL', 'BLOG', 'SEO', 'AEO_FAQ', 'ANSWER_SNIPPET');

-- CreateEnum
CREATE TYPE "ExportType" AS ENUM ('CAMPAIGN_PACK', 'AEO_PACK');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "email" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "industry" "IndustryType",
    "onboardingCompletedAt" TIMESTAMP(3),
    "demoInitializedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'OWNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessProfile" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "website" TEXT,
    "phone" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "serviceArea" TEXT NOT NULL,
    "serviceAreaRadiusMiles" INTEGER,
    "industryLabel" TEXT,
    "brandTone" "BrandTone",
    "averageJobValue" DECIMAL(10,2),
    "highestMarginService" TEXT,
    "lowestPriorityService" TEXT,
    "technicians" INTEGER,
    "jobsPerTechnicianPerDay" INTEGER,
    "weeklyCapacity" INTEGER,
    "targetBookedJobsPerWeek" INTEGER,
    "targetWeeklyRevenue" DECIMAL(10,2),
    "preferredServices" TEXT[],
    "deprioritizedServices" TEXT[],
    "busyMonths" TEXT[],
    "slowMonths" TEXT[],
    "seasonalityNotes" TEXT,
    "googleBusinessProfileUrl" TEXT,
    "servicePageUrls" TEXT[],
    "hasServicePages" BOOLEAN NOT NULL DEFAULT false,
    "hasFaqContent" BOOLEAN NOT NULL DEFAULT false,
    "hasBlog" BOOLEAN NOT NULL DEFAULT false,
    "hasGoogleBusinessPage" BOOLEAN NOT NULL DEFAULT false,
    "aeoReadinessScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competitor" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "googleBusinessUrl" TEXT,
    "notes" TEXT,
    "serviceFocus" TEXT[],
    "rating" DOUBLE PRECISION,
    "reviewCount" INTEGER,
    "isPrimaryCompetitor" BOOLEAN NOT NULL DEFAULT false,
    "isRunningAds" BOOLEAN,
    "isPostingActively" BOOLEAN,
    "hasActivePromo" BOOLEAN,
    "reviewVelocity" TEXT,
    "signalSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Competitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevenueOpportunity" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "opportunityType" "OpportunityType" NOT NULL,
    "whyNow" TEXT[],
    "priorityScore" DOUBLE PRECISION,
    "estimatedRevenueMin" DECIMAL(10,2),
    "estimatedRevenueMax" DECIMAL(10,2),
    "estimatedBookedJobsMin" INTEGER,
    "estimatedBookedJobsMax" INTEGER,
    "confidence" "ConfidenceLevel",
    "capacityFit" "CapacityFit",
    "recommendedCampaignType" "CampaignType",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevenueOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsightExplanation" (
    "id" TEXT NOT NULL,
    "revenueOpportunityId" TEXT NOT NULL,
    "explanationText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InsightExplanation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "campaignType" "CampaignType" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "whyNow" TEXT[],
    "estimatedLeadsMin" INTEGER,
    "estimatedLeadsMax" INTEGER,
    "estimatedBookedJobsMin" INTEGER,
    "estimatedBookedJobsMax" INTEGER,
    "estimatedRevenueMin" DECIMAL(10,2),
    "estimatedRevenueMax" DECIMAL(10,2),
    "capacityFit" "CapacityFit",
    "campaignObjective" "CampaignObjective",
    "isLaunched" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntelligenceAlert" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "alertType" "AlertType" NOT NULL,
    "source" "AlertSource",
    "severity" "AlertSeverity",
    "recommendedAction" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntelligenceAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "campaignCode" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "recommendationId" TEXT,
    "revenueOpportunityId" TEXT,
    "name" TEXT NOT NULL,
    "campaignType" "CampaignType" NOT NULL,
    "objective" "CampaignObjective",
    "targetService" TEXT,
    "offer" TEXT,
    "audience" TEXT,
    "serviceArea" TEXT,
    "estimatedLeads" INTEGER,
    "estimatedBookedJobs" INTEGER,
    "estimatedRevenue" DECIMAL(10,2),
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "qualityReviewStatus" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "briefJson" JSONB,
    "campaignStartDate" TIMESTAMP(3),
    "campaignEndDate" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "launchedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignAsset" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "assetType" "AssetType" NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "metadataJson" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttributionEntry" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "campaignId" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "leadsGenerated" INTEGER,
    "bookedJobs" INTEGER,
    "revenue" DECIMAL(10,2),
    "roi" DOUBLE PRECISION,
    "confidence" "ConfidenceLevel",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttributionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "campaignId" TEXT,
    "userId" TEXT,
    "exportType" "ExportType" NOT NULL,
    "fileName" TEXT,
    "fileCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExportLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkUserId_key" ON "User"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_key" ON "WorkspaceMember"("workspaceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessProfile_workspaceId_key" ON "BusinessProfile"("workspaceId");

-- CreateIndex
CREATE INDEX "Competitor_workspaceId_idx" ON "Competitor"("workspaceId");

-- CreateIndex
CREATE INDEX "RevenueOpportunity_workspaceId_idx" ON "RevenueOpportunity"("workspaceId");

-- CreateIndex
CREATE INDEX "InsightExplanation_revenueOpportunityId_idx" ON "InsightExplanation"("revenueOpportunityId");

-- CreateIndex
CREATE INDEX "Recommendation_workspaceId_idx" ON "Recommendation"("workspaceId");

-- CreateIndex
CREATE INDEX "IntelligenceAlert_workspaceId_idx" ON "IntelligenceAlert"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_campaignCode_key" ON "Campaign"("campaignCode");

-- CreateIndex
CREATE INDEX "Campaign_workspaceId_idx" ON "Campaign"("workspaceId");

-- CreateIndex
CREATE INDEX "Campaign_recommendationId_idx" ON "Campaign"("recommendationId");

-- CreateIndex
CREATE INDEX "Campaign_revenueOpportunityId_idx" ON "Campaign"("revenueOpportunityId");

-- CreateIndex
CREATE INDEX "Campaign_campaignStartDate_idx" ON "Campaign"("campaignStartDate");

-- CreateIndex
CREATE INDEX "Campaign_campaignEndDate_idx" ON "Campaign"("campaignEndDate");

-- CreateIndex
CREATE INDEX "Campaign_workspaceId_campaignStartDate_campaignEndDate_idx" ON "Campaign"("workspaceId", "campaignStartDate", "campaignEndDate");

-- CreateIndex
CREATE INDEX "CampaignAsset_campaignId_idx" ON "CampaignAsset"("campaignId");

-- CreateIndex
CREATE INDEX "AttributionEntry_workspaceId_idx" ON "AttributionEntry"("workspaceId");

-- CreateIndex
CREATE INDEX "AttributionEntry_campaignId_idx" ON "AttributionEntry"("campaignId");

-- CreateIndex
CREATE INDEX "AttributionEntry_periodStart_periodEnd_idx" ON "AttributionEntry"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "AttributionEntry_workspaceId_periodStart_periodEnd_idx" ON "AttributionEntry"("workspaceId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "ExportLog_workspaceId_idx" ON "ExportLog"("workspaceId");

-- CreateIndex
CREATE INDEX "ExportLog_campaignId_idx" ON "ExportLog"("campaignId");

-- CreateIndex
CREATE INDEX "ExportLog_userId_idx" ON "ExportLog"("userId");

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessProfile" ADD CONSTRAINT "BusinessProfile_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competitor" ADD CONSTRAINT "Competitor_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueOpportunity" ADD CONSTRAINT "RevenueOpportunity_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsightExplanation" ADD CONSTRAINT "InsightExplanation_revenueOpportunityId_fkey" FOREIGN KEY ("revenueOpportunityId") REFERENCES "RevenueOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntelligenceAlert" ADD CONSTRAINT "IntelligenceAlert_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "Recommendation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_revenueOpportunityId_fkey" FOREIGN KEY ("revenueOpportunityId") REFERENCES "RevenueOpportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignAsset" ADD CONSTRAINT "CampaignAsset_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributionEntry" ADD CONSTRAINT "AttributionEntry_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributionEntry" ADD CONSTRAINT "AttributionEntry_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportLog" ADD CONSTRAINT "ExportLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportLog" ADD CONSTRAINT "ExportLog_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportLog" ADD CONSTRAINT "ExportLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
