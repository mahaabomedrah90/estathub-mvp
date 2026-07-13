-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "annualRentExpected" DOUBLE PRECISION,
ADD COLUMN     "feeSnapshot" JSONB,
ADD COLUMN     "isLeased" BOOLEAN,
ADD COLUMN     "isMortgaged" BOOLEAN,
ADD COLUMN     "minimumSalePrice" DOUBLE PRECISION,
ADD COLUMN     "netArea" DOUBLE PRECISION;
