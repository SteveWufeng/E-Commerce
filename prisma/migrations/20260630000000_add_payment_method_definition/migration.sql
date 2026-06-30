-- CreateEnum
CREATE TYPE "ProofType" AS ENUM ('NONE', 'IMAGE', 'TEXT', 'IMAGE_AND_TEXT');

-- CreateEnum
CREATE TYPE "ProofStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateTable: PaymentMethodDefinition
CREATE TABLE "PaymentMethodDefinition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "iconUrl" TEXT,
    "qrCodeUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "proofType" "ProofType" NOT NULL DEFAULT 'IMAGE',
    "proofLabel" TEXT,
    "proofImageRequired" BOOLEAN NOT NULL DEFAULT false,
    "requiresTransactionId" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethodDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PaymentProof
CREATE TABLE "PaymentProof" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "paymentMethodDefinitionId" TEXT NOT NULL,
    "transactionId" TEXT,
    "amount" DECIMAL(10,2),
    "imageUrl" TEXT,
    "notes" TEXT,
    "status" "ProofStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedById" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentProof_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethodDefinition_name_key" ON "PaymentMethodDefinition"("name");

-- CreateIndex
CREATE INDEX "PaymentMethodDefinition_isActive_idx" ON "PaymentMethodDefinition"("isActive");

-- CreateIndex
CREATE INDEX "PaymentMethodDefinition_sortOrder_idx" ON "PaymentMethodDefinition"("sortOrder");

-- AddForeignKey
ALTER TABLE "PaymentProof" ADD CONSTRAINT "PaymentProof_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentProof" ADD CONSTRAINT "PaymentProof_paymentMethodDefinitionId_fkey" FOREIGN KEY ("paymentMethodDefinitionId") REFERENCES "PaymentMethodDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentProof" ADD CONSTRAINT "PaymentProof_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
