-- CreateEnum
CREATE TYPE "public"."WorkspaceStatus" AS ENUM ('PENDING_ACTIVATION', 'ACTIVE', 'PAST_DUE', 'CANCELED');

-- AlterTable
ALTER TABLE "public"."Workspace" ADD COLUMN     "activatedAt" TIMESTAMP(3),
ADD COLUMN     "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "currentPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "status" "public"."WorkspaceStatus" NOT NULL DEFAULT 'PENDING_ACTIVATION',
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripePriceId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT;

-- CreateIndex
CREATE INDEX "Workspace_status_idx" ON "public"."Workspace"("status");

-- CreateIndex
CREATE INDEX "Workspace_stripeCustomerId_idx" ON "public"."Workspace"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "Workspace_stripeSubscriptionId_idx" ON "public"."Workspace"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Workspace_currentPeriodEnd_idx" ON "public"."Workspace"("currentPeriodEnd");
