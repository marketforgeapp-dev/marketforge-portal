-- CreateEnum
CREATE TYPE "public"."StrategySessionLeadStatus" AS ENUM ('NEW', 'PREPARING', 'SCHEDULED', 'COMPLETED', 'CONVERTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "public"."StrategySessionConversionMatchType" AS ENUM ('AUTO_DOMAIN_AND_NAME', 'AUTO_DOMAIN', 'MANUAL');

-- CreateTable
CREATE TABLE "public"."StrategySessionLead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "businessName" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "availability" TEXT,
    "normalizedBusinessName" TEXT NOT NULL,
    "websiteDomain" TEXT NOT NULL,
    "status" "public"."StrategySessionLeadStatus" NOT NULL DEFAULT 'NEW',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionAt" TIMESTAMP(3),
    "preparedAt" TIMESTAMP(3),
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "convertedWorkspaceId" TEXT,
    "convertedAt" TIMESTAMP(3),
    "conversionMatchType" "public"."StrategySessionConversionMatchType",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategySessionLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StrategySessionLead_convertedWorkspaceId_key" ON "public"."StrategySessionLead"("convertedWorkspaceId");

-- CreateIndex
CREATE INDEX "StrategySessionLead_status_idx" ON "public"."StrategySessionLead"("status");

-- CreateIndex
CREATE INDEX "StrategySessionLead_email_idx" ON "public"."StrategySessionLead"("email");

-- CreateIndex
CREATE INDEX "StrategySessionLead_websiteDomain_idx" ON "public"."StrategySessionLead"("websiteDomain");

-- CreateIndex
CREATE INDEX "StrategySessionLead_normalizedBusinessName_idx" ON "public"."StrategySessionLead"("normalizedBusinessName");

-- CreateIndex
CREATE INDEX "StrategySessionLead_requestedAt_idx" ON "public"."StrategySessionLead"("requestedAt");

-- CreateIndex
CREATE INDEX "StrategySessionLead_createdAt_idx" ON "public"."StrategySessionLead"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."StrategySessionLead" ADD CONSTRAINT "StrategySessionLead_convertedWorkspaceId_fkey" FOREIGN KEY ("convertedWorkspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
