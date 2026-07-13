-- CreateEnum
CREATE TYPE "PropertyLeadStatus" AS ENUM ('NEW', 'UNDER_REVIEW', 'NEEDS_INFO', 'ACCEPTED', 'REJECTED', 'CONVERTED_TO_PROPERTY');

-- CreateTable
CREATE TABLE "PropertyLead" (
    "id" TEXT NOT NULL,
    "applicantType" TEXT,
    "fullName" TEXT,
    "companyName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "propertyName" TEXT,
    "propertyType" TEXT,
    "city" TEXT,
    "district" TEXT,
    "googleMapsUrl" TEXT,
    "landArea" DOUBLE PRECISION,
    "buildingArea" DOUBLE PRECISION,
    "buildingYear" INTEGER,
    "requestedPrice" DOUBLE PRECISION,
    "isPriceNegotiable" BOOLEAN,
    "isLeased" BOOLEAN,
    "annualRent" DOUBLE PRECISION,
    "leaseExpiryDate" TIMESTAMP(3),
    "hasMortgage" BOOLEAN,
    "hasOwnershipPartner" BOOLEAN,
    "hasLegalDispute" BOOLEAN,
    "noLegalIssues" BOOLEAN,
    "shortDescription" TEXT,
    "imageUrls" JSONB,
    "deedImageUrl" TEXT,
    "dataAccuracyConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "reviewConsentConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "noAcceptanceGuaranteeConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "qualificationScore" INTEGER,
    "tokenizationSuitabilityScore" INTEGER,
    "internalRecommendation" TEXT,
    "adminStatus" TEXT,
    "status" "PropertyLeadStatus" NOT NULL DEFAULT 'NEW',
    "ownerId" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewNotes" TEXT,

    CONSTRAINT "PropertyLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertyLead_tenantId_idx" ON "PropertyLead"("tenantId");

-- CreateIndex
CREATE INDEX "PropertyLead_ownerId_idx" ON "PropertyLead"("ownerId");

-- CreateIndex
CREATE INDEX "PropertyLead_status_idx" ON "PropertyLead"("status");

-- CreateIndex
CREATE INDEX "PropertyLead_createdAt_idx" ON "PropertyLead"("createdAt");

