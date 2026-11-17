-- AlterTable
ALTER TABLE "customer" ADD COLUMN     "shareTokenCreatedAt" TIMESTAMP(3),
ADD COLUMN     "shareTokenHash" TEXT;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tempPasswordExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "customer_shareTokenHash_key" ON "customer"("shareTokenHash");

