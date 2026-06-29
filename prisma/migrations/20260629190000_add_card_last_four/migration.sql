-- Add cardLastFour column to Order table
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "cardLastFour" TEXT;
