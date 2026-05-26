-- AlterEnum: Add REJECTED status
ALTER TYPE "OrderStatus" ADD VALUE 'REJECTED';

-- AlterTable: Add rejectionReason column
ALTER TABLE "Order" ADD COLUMN "rejectionReason" TEXT;
