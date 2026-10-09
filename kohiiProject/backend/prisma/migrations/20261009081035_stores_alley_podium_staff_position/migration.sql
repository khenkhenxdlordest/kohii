-- CreateEnum
CREATE TYPE "StaffPosition" AS ENUM ('CASHIER', 'BARISTA', 'KITCHEN');

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "hasKitchen" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "position" "StaffPosition";

-- Data: ang dalawang store ay Alley (nasa baba, may kitchen) at Podium (nasa likod)
UPDATE "Store" SET "code" = 'ALY', "name" = 'Alley', "address" = 'Ground floor (sa baba)', "hasKitchen" = true WHERE "code" = 'B1';
UPDATE "Store" SET "code" = 'PDM', "name" = 'Podium', "address" = 'Back area (sa likod)', "hasKitchen" = false WHERE "code" = 'B2';

-- Ang mga kasalukuyang cashier ay naka-set sa posisyong CASHIER
UPDATE "User" SET "position" = 'CASHIER' WHERE "role" = 'CASHIER' AND "position" IS NULL;
