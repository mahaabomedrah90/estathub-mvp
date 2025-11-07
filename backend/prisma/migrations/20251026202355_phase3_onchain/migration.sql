-- AlterTable
ALTER TABLE "Certificate" ADD COLUMN "blockchainTxId" TEXT;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "blockchainTxId" TEXT;

-- CreateTable
CREATE TABLE "OnChainEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "txId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "userId" INTEGER,
    "propertyId" INTEGER,
    "orderId" INTEGER,
    "payload" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "OnChainEvent_txId_key" ON "OnChainEvent"("txId");
