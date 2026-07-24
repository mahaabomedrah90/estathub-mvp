-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PropertyLeadStatus" ADD VALUE 'READY_FOR_FINAL_REVIEW';
ALTER TYPE "PropertyLeadStatus" ADD VALUE 'FINAL_APPROVED';

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "feeSnapshot" JSONB;

-- AlterTable
ALTER TABLE "PropertyLead" ADD COLUMN     "convertedPropertyId" TEXT,
ADD COLUMN     "feeSnapshot" JSONB,
ADD COLUMN     "feesLockedAt" TIMESTAMP(3),
ADD COLUMN     "listingDraft" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "PropertyLead_convertedPropertyId_key" ON "PropertyLead"("convertedPropertyId");
