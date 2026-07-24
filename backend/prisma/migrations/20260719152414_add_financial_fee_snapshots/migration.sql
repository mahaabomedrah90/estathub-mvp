-- Migration: add_financial_fee_snapshots
-- Safe additive-only migration. All columns are nullable — no existing data is affected.
-- Backfill: historical rows intentionally left NULL; new orders populate on write.
--
-- HISTORY RECONCILIATION (2026-07-23): This finance-lineage migration originally
-- also added "Property"."feeSnapshot". That column is already created by the
-- earlier production-lineage migration 20260718143738_add_property_lead_finalization_fields,
-- which is deployed to production (present at prod base commit 6e15050). This
-- migration has NEVER been deployed to production (absent at 6e15050), so the
-- duplicate Property.feeSnapshot ADD COLUMN was safely removed here to let the
-- full history replay from an empty database (fixes P3006 shadow-DB failure).
-- Property.feeSnapshot is intentionally NOT touched by this migration.

-- Order: store fee rate, fee amount, and total payable at order-creation time
ALTER TABLE "Order"
  ADD COLUMN "feeRateSnapshot"   DOUBLE PRECISION,
  ADD COLUMN "feeAmountSnapshot" DOUBLE PRECISION,
  ADD COLUMN "totalPayable"      DOUBLE PRECISION;

-- Rollback plan (run this to undo):
-- ALTER TABLE "Order" DROP COLUMN IF EXISTS "feeRateSnapshot";
-- ALTER TABLE "Order" DROP COLUMN IF EXISTS "feeAmountSnapshot";
-- ALTER TABLE "Order" DROP COLUMN IF EXISTS "totalPayable";
