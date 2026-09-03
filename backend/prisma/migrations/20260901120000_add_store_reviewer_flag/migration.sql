-- Additive, non-destructive: marks an account as an app-store review account.
-- Existing rows default to false, so no customer is affected.
-- This flag grants NO privileges; it only makes the account read-only for
-- financial writes (see src/middleware/storeReviewer.ts).
ALTER TABLE "User" ADD COLUMN "isStoreReviewer" BOOLEAN NOT NULL DEFAULT false;
