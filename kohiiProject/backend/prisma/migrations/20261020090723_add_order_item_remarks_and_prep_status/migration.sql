-- CreateEnum
CREATE TYPE "PrepStatus" AS ENUM ('PENDING', 'READY', 'DELIVERED');

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "prepStatus" "PrepStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "remarks" TEXT;
