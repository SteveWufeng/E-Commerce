-- AlterTable: change paymentMethod from PaymentMethod enum to TEXT
-- Existing enum values are valid string values, so a direct cast works.
ALTER TABLE "Order" ALTER COLUMN "paymentMethod" TYPE TEXT;
