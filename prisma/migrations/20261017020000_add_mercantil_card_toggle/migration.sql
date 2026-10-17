-- AlterTable: Add mercantilCardEnabled toggle to Settings
ALTER TABLE "Settings" ADD COLUMN "mercantilCardEnabled" BOOLEAN NOT NULL DEFAULT true;
