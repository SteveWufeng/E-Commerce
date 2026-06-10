-- AlterTable: Add mercantilRedirectEnabled toggle to Settings
ALTER TABLE "Settings" ADD COLUMN "mercantilRedirectEnabled" BOOLEAN NOT NULL DEFAULT false;
