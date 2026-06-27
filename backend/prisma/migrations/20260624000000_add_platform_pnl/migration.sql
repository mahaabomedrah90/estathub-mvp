-- CreateEnum
CREATE TYPE "PlatformRevenueType" AS ENUM ('INVESTMENT_FEE', 'OWNER_FEE', 'MANAGEMENT_FEE', 'SUBSCRIPTION', 'OTHER');

-- CreateEnum
CREATE TYPE "PlatformExpenseCategory" AS ENUM ('TECHNOLOGY', 'OPERATIONS', 'MARKETING', 'PAYROLL', 'PROFESSIONAL_SERVICES', 'OTHER');

-- CreateTable: platform_revenues
CREATE TABLE "platform_revenues" (
    "id"          TEXT NOT NULL,
    "type"        "PlatformRevenueType" NOT NULL,
    "description" TEXT NOT NULL,
    "amount"      DOUBLE PRECISION NOT NULL,
    "propertyId"  TEXT,
    "userId"      TEXT,
    "date"        TIMESTAMP(3) NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    "createdBy"   TEXT,
    "notes"       TEXT,
    CONSTRAINT "platform_revenues_pkey" PRIMARY KEY ("id")
);

-- CreateTable: platform_expenses
CREATE TABLE "platform_expenses" (
    "id"          TEXT NOT NULL,
    "category"    "PlatformExpenseCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "amount"      DOUBLE PRECISION NOT NULL,
    "vendor"      TEXT,
    "date"        TIMESTAMP(3) NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    "createdBy"   TEXT,
    "notes"       TEXT,
    "invoiceRef"  TEXT,
    CONSTRAINT "platform_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "platform_revenues_type_idx" ON "platform_revenues"("type");
CREATE INDEX "platform_revenues_date_idx" ON "platform_revenues"("date");
CREATE INDEX "platform_revenues_propertyId_idx" ON "platform_revenues"("propertyId");

-- CreateIndex
CREATE INDEX "platform_expenses_category_idx" ON "platform_expenses"("category");
CREATE INDEX "platform_expenses_date_idx" ON "platform_expenses"("date");
