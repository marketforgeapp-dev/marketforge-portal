-- CreateEnum
CREATE TYPE "public"."BillingOfferType" AS ENUM ('FOUNDER_1', 'FOUNDER_2', 'FOUNDER_3', 'PROMO_CODE');

-- AlterTable
ALTER TABLE "public"."Workspace" ADD COLUMN     "appliedOfferType" "public"."BillingOfferType",
ADD COLUMN     "appliedPromotionCode" TEXT,
ADD COLUMN     "stripeSubscriptionScheduleId" TEXT;

-- CreateIndex
CREATE INDEX "Workspace_stripeSubscriptionScheduleId_idx" ON "public"."Workspace"("stripeSubscriptionScheduleId");
