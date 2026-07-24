-- Four-fee model: preparation fee becomes recognizable platform revenue when an
-- admin marks it collected. Additive enum value; OWNER_FEE retained for legacy.
ALTER TYPE "PlatformRevenueType" ADD VALUE IF NOT EXISTS 'PREPARATION_FEE';
