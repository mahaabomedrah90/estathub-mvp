-- Migration: add_financial_fee_snapshots
-- Safe additive-only migration. All columns are nullable — no existing data is affected.
-- Backfill: historical rows intentionally left NULL; new orders/properties populate on write.

-- Order: store fee rate, fee amount, and total payable at order-creation time
ALTER TABLE "Order"
  ADD COLUMN "feeRateSnapshot"   DOUBLE PRECISION,
  ADD COLUMN "feeAmountSnapshot" DOUBLE PRECISION,
  ADD COLUMN "totalPayable"      DOUBLE PRECISION;

-- Property: store a JSON copy of the global fee settings when the property fee is locked
ALTER TABLE "Property"
  ADD COLUMN "feeSnapshot" JSONB;

-- Rollback plan (run this to undo):
-- ALTER TABLE "Order" DROP COLUMN IF EXISTS "feeRateSnapshot";
-- ALTER TABLE "Order" DROP COLUMN IF EXISTS "feeAmountSnapshot";
-- ALTER TABLE "Order" DROP COLUMN IF EXISTS "totalPayable";
-- ALTER TABLE "Property" DROP COLUMN IF EXISTS "feeSnapshot";
