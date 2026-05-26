-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'BANK_TRANSFER';

-- AlterTable: Add receiptImage column
ALTER TABLE "Order" ADD COLUMN "receiptImage" TEXT;

-- Drop PickupSlot columns that reference Order and User
ALTER TABLE "PickupSlot" DROP COLUMN IF EXISTS "orderId";
ALTER TABLE "PickupSlot" DROP COLUMN IF EXISTS "userId";

-- Drop index on orderId if exists
DROP INDEX IF EXISTS "PickupSlot_orderId_key";
DROP INDEX IF EXISTS "PickupSlot_orderId_idx";
