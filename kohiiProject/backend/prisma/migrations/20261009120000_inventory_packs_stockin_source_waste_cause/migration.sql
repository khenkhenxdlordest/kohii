-- CreateEnum
CREATE TYPE "StockInSource" AS ENUM ('SUPPLIER', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "WasteCause" AS ENUM ('SPOILED', 'EXPIRED', 'SPILLED', 'DAMAGED', 'OTHER');

-- CreateTable
CREATE TABLE "InventoryPack" (
    "id" SERIAL NOT NULL,
    "inventoryItemId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "size" DECIMAL(12,3) NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryPack_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InventoryPack_inventoryItemId_label_key" ON "InventoryPack"("inventoryItemId", "label");

-- AddForeignKey
ALTER TABLE "InventoryPack" ADD CONSTRAINT "InventoryPack_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data: ililipat ang dating iisang pack size sa bagong table bago burahin ang mga column
INSERT INTO "InventoryPack" ("inventoryItemId", "label", "size", "isDefault")
SELECT "id", INITCAP(COALESCE(NULLIF("packLabel", ''), 'pack')), "packSize", true
FROM "InventoryItem"
WHERE "packSize" IS NOT NULL;

-- AlterTable
ALTER TABLE "InventoryItem" DROP COLUMN "packLabel",
DROP COLUMN "packSize";

-- AlterTable
ALTER TABLE "StockIn" ADD COLUMN     "source" "StockInSource" NOT NULL DEFAULT 'SUPPLIER',
ADD COLUMN     "totalCost" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "StockInItem" ADD COLUMN     "packCount" DECIMAL(12,3),
ADD COLUMN     "packId" INTEGER;

-- AddForeignKey
ALTER TABLE "StockInItem" ADD CONSTRAINT "StockInItem_packId_fkey" FOREIGN KEY ("packId") REFERENCES "InventoryPack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "WasteLog" ADD COLUMN     "cause" "WasteCause" NOT NULL DEFAULT 'OTHER',
ALTER COLUMN "reason" DROP NOT NULL;