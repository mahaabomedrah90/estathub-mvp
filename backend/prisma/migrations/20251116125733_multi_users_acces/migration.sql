-- AlterTable
ALTER TABLE "Property" ALTER COLUMN "tenantId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "tenantId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP DEFAULT,
ALTER COLUMN "tenantId" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Wallet" ALTER COLUMN "tenantId" DROP DEFAULT;
