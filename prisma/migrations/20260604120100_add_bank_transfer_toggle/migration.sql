-- AlterTable: Add bankTransferEnabled toggle to Settings
ALTER TABLE "Settings" ADD COLUMN "bankTransferEnabled" BOOLEAN NOT NULL DEFAULT false;
