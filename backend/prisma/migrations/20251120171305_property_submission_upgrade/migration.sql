-- CreateEnum
CREATE TYPE "OwnershipType" AS ENUM ('SINGLE_OWNER', 'SHARED', 'CORPORATE', 'USUFRUCT', 'ELECTRONIC_DEED', 'PAPER_DEED');

-- CreateEnum
CREATE TYPE "PropertyCondition" AS ENUM ('NEW', 'USED', 'RENOVATED', 'UNDER_CONSTRUCTION');

-- CreateEnum
CREATE TYPE "PayoutSchedule" AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "OwnerType" AS ENUM ('INDIVIDUAL', 'COMPANY');

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "authorizedPersonId" TEXT,
ADD COLUMN     "authorizedPersonName" TEXT,
ADD COLUMN     "buildingAge" INTEGER,
ADD COLUMN     "buildingPermitUrl" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "commercialRegistration" TEXT,
ADD COLUMN     "declarationDocumentSharingApproval" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "declarationLegalResponsibility" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "declarationPropertyAccuracy" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "declarationTokenizationApproval" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deedAuthority" TEXT,
ADD COLUMN     "deedDate" TIMESTAMP(3),
ADD COLUMN     "deedDocumentUrl" TEXT,
ADD COLUMN     "electricityBillUrl" TEXT,
ADD COLUMN     "floorsCount" INTEGER,
ADD COLUMN     "gpsLatitude" DOUBLE PRECISION,
ADD COLUMN     "gpsLongitude" DOUBLE PRECISION,
ADD COLUMN     "isDraft" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "mainImagesUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "marketValue" DOUBLE PRECISION,
ADD COLUMN     "nationalIdOrCR" TEXT,
ADD COLUMN     "ownerEmail" TEXT,
ADD COLUMN     "ownerIban" TEXT,
ADD COLUMN     "ownerIdDocumentUrl" TEXT,
ADD COLUMN     "ownerPhone" TEXT,
ADD COLUMN     "ownerRetainedPercentage" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "ownerType" "OwnerType",
ADD COLUMN     "ownershipType" "OwnershipType",
ADD COLUMN     "payoutSchedule" "PayoutSchedule" DEFAULT 'MONTHLY',
ADD COLUMN     "propertyCondition" "PropertyCondition",
ADD COLUMN     "propertyDescription" TEXT,
ADD COLUMN     "propertyTypeDetailed" TEXT,
ADD COLUMN     "sitePlanDocumentUrl" TEXT,
ADD COLUMN     "submissionCompletedAt" TIMESTAMP(3),
ADD COLUMN     "unitsCount" INTEGER,
ADD COLUMN     "valuationReportUrl" TEXT,
ADD COLUMN     "waterBillUrl" TEXT;
