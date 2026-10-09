-- CreateEnum
CREATE TYPE "CategoryGroup" AS ENUM ('DRINKS', 'RICE_MEALS', 'SNACKS');

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "group" "CategoryGroup" NOT NULL DEFAULT 'DRINKS';

-- Existing data: ang mga snack category ay hindi drinks (walang upsize)
UPDATE "Category" SET "group" = 'SNACKS' WHERE "name" ILIKE '%snack%';
UPDATE "Category" SET "group" = 'RICE_MEALS' WHERE "name" ILIKE '%rice%' OR "name" ILIKE '%meal%';

-- Hindi puwedeng may upsize ang product na hindi drinks
UPDATE "Product" SET "upsizePrice" = NULL WHERE "categoryId" IN (SELECT "id" FROM "Category" WHERE "group" <> 'DRINKS');
