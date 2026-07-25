-- Phase 7a: Owner Final Acceptance Gate — ADDITIVE ONLY.
-- Adds two workflow statuses and four nullable columns. No drops, no ALTER COLUMN,
-- no NOT NULL, no defaults, no backfill, no changes to existing columns.

-- AlterEnum
ALTER TYPE "PropertyLeadStatus" ADD VALUE 'AWAITING_OWNER_FINAL_ACCEPTANCE';
ALTER TYPE "PropertyLeadStatus" ADD VALUE 'OWNER_FINAL_ACCEPTED';

-- AlterTable
ALTER TABLE "PropertyLead" ADD COLUMN "ownerFinalAcceptanceAt" TIMESTAMP(3);
ALTER TABLE "PropertyLead" ADD COLUMN "ownerFinalAcceptanceBy" TEXT;
ALTER TABLE "PropertyLead" ADD COLUMN "ownerFinalAcceptance" JSONB;
ALTER TABLE "PropertyLead" ADD COLUMN "ownerFeeReceiptKey" TEXT;
