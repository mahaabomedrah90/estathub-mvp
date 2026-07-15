-- CreateTable
CREATE TABLE "WaitlistLead" (
    "id" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "amount" TEXT NOT NULL DEFAULT '',
    "language" TEXT NOT NULL DEFAULT 'en',
    "source" TEXT NOT NULL DEFAULT 'home',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaitlistLead_pkey" PRIMARY KEY ("id")
);
