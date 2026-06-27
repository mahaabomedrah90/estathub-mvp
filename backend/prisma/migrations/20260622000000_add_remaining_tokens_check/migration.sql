-- Phase 2: Inventory protection — prevent remainingTokens from going negative.
-- Pre-flight verified: no existing Property row has remainingTokens < 0.
ALTER TABLE "Property"
  ADD CONSTRAINT check_remaining_tokens_non_negative
  CHECK ("remainingTokens" >= 0);
