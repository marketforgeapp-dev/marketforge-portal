-- CreateTable
CREATE TABLE "WorkspaceOpportunitySnapshot" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "snapshotVersion" INTEGER NOT NULL DEFAULT 1,
    "topOpportunityJson" JSONB NOT NULL,
    "backlogJson" JSONB NOT NULL,
    "heroJson" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "invalidatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceOpportunitySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceOpportunitySnapshot_workspaceId_key" ON "WorkspaceOpportunitySnapshot"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkspaceOpportunitySnapshot_workspaceId_idx" ON "WorkspaceOpportunitySnapshot"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkspaceOpportunitySnapshot_expiresAt_idx" ON "WorkspaceOpportunitySnapshot"("expiresAt");

-- AddForeignKey
ALTER TABLE "WorkspaceOpportunitySnapshot" ADD CONSTRAINT "WorkspaceOpportunitySnapshot_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
