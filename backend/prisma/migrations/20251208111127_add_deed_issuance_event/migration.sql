-- CreateTable
CREATE TABLE "DeedIssuanceEvent" (
    "id" TEXT NOT NULL,
    "deedId" TEXT NOT NULL,
    "deltaTokens" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderId" TEXT,
    "note" TEXT,

    CONSTRAINT "DeedIssuanceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeedIssuanceEvent_deedId_idx" ON "DeedIssuanceEvent"("deedId");

-- AddForeignKey
ALTER TABLE "DeedIssuanceEvent" ADD CONSTRAINT "DeedIssuanceEvent_deedId_fkey" FOREIGN KEY ("deedId") REFERENCES "DigitalDeed"("id") ON DELETE CASCADE ON UPDATE CASCADE;
