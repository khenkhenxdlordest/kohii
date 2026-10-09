-- AlterEnum
ALTER TYPE "InventoryItemType" ADD VALUE 'MEAL';

-- AlterEnum
ALTER TYPE "StockMovementType" ADD VALUE 'WITHDRAW';

-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN     "packLabel" TEXT,
ADD COLUMN     "packSize" DECIMAL(12,3);
