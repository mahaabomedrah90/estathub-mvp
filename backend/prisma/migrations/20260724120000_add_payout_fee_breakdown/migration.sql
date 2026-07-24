-- Persist the management-fee and reserve amounts on each Payout so they are
-- reportable (reserve was previously only derivable arithmetically). Additive,
-- nullable — historical payouts stay NULL; new distributions populate on write.
ALTER TABLE "Payout"
  ADD COLUMN "mgmtFeeAmount" DOUBLE PRECISION,
  ADD COLUMN "reserveAmount" DOUBLE PRECISION;
