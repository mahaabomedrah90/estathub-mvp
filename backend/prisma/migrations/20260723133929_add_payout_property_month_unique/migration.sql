-- Concurrency-safe guard: at most one Payout (distribution) per property per month.
-- The application keeps a pre-check (findFirst) for a friendly 409, but THIS
-- unique index is the authoritative protection against concurrent double-execution.
-- CreateIndex
CREATE UNIQUE INDEX "Payout_propertyId_month_key" ON "Payout"("propertyId", "month");
