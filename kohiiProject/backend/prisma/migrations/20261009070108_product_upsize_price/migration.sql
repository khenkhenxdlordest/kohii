-- CreateEnum
CREATE TYPE "ProductSize" AS ENUM ('REGULAR', 'UPSIZE');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "upsizePrice" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "ProductPriceHistory" ADD COLUMN     "size" "ProductSize" NOT NULL DEFAULT 'REGULAR',
ALTER COLUMN "newPrice" DROP NOT NULL;
