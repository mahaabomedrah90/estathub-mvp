-- CreateTable: property_financial_models
-- Each property carries its own financial model (fee rates, yields, operating expenses).
-- Reports derive all calculations from these fields instead of global settings.

CREATE TABLE "property_financial_models" (
    "id"                     TEXT NOT NULL,
    "propertyId"             TEXT NOT NULL,
    "platformFeeRate"        DOUBLE PRECISION NOT NULL DEFAULT 5,
    "ownerFeeRate"           DOUBLE PRECISION NOT NULL DEFAULT 0,
    "listingFeeFlat"         DOUBLE PRECISION NOT NULL DEFAULT 0,
    "managementFeeRate"      DOUBLE PRECISION NOT NULL DEFAULT 8,
    "maintenanceReserveRate" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "vacancyRate"            DOUBLE PRECISION NOT NULL DEFAULT 5,
    "operatingExpenseRate"   DOUBLE PRECISION NOT NULL DEFAULT 15,
    "expectedAnnualRent"     DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expectedAnnualYield"    DOUBLE PRECISION NOT NULL DEFAULT 8,
    "distributionFrequency"  TEXT NOT NULL DEFAULT 'MONTHLY',
    "ownerRetainedIncomePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"              TIMESTAMP(3) NOT NULL,
    CONSTRAINT "property_financial_models_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "property_financial_models_propertyId_key" ON "property_financial_models"("propertyId");
CREATE INDEX "property_financial_models_propertyId_idx"       ON "property_financial_models"("propertyId");

ALTER TABLE "property_financial_models"
    ADD CONSTRAINT "property_financial_models_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
