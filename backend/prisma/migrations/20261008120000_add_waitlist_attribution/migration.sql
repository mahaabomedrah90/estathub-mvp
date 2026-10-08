-- Additive, non-destructive: marketing attribution (UTM) for waitlist leads.
-- All columns are nullable with no default, so existing rows are untouched
-- and remain NULL (shown as "unknown" in the admin waiting list).
-- The existing "source" column is unchanged.
ALTER TABLE "WaitlistLead" ADD COLUMN "utmSource" TEXT;
ALTER TABLE "WaitlistLead" ADD COLUMN "utmMedium" TEXT;
ALTER TABLE "WaitlistLead" ADD COLUMN "utmCampaign" TEXT;
ALTER TABLE "WaitlistLead" ADD COLUMN "utmContent" TEXT;
ALTER TABLE "WaitlistLead" ADD COLUMN "utmTerm" TEXT;
ALTER TABLE "WaitlistLead" ADD COLUMN "landingUrl" TEXT;
ALTER TABLE "WaitlistLead" ADD COLUMN "referrer" TEXT;
