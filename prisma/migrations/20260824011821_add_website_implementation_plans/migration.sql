-- CreateTable
CREATE TABLE "public"."WebsiteImplementationPlan" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "gapType" TEXT NOT NULL,
    "service" TEXT,
    "title" TEXT NOT NULL,
    "planJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteImplementationPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebsiteImplementationPlan_workspaceId_idx" ON "public"."WebsiteImplementationPlan"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteImplementationPlan_workspaceId_recommendationId_key" ON "public"."WebsiteImplementationPlan"("workspaceId", "recommendationId");

-- AddForeignKey
ALTER TABLE "public"."WebsiteImplementationPlan" ADD CONSTRAINT "WebsiteImplementationPlan_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
