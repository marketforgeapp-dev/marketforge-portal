-- AlterTable
ALTER TABLE "public"."BusinessProfile" ADD COLUMN     "generalServiceHandledByPartner" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "promoteGeneralServiceActions" BOOLEAN NOT NULL DEFAULT false;
