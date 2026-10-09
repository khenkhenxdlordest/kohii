-- CreateTable
CREATE TABLE "ProductPrice" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "size" "ProductSize" NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductPrice_productId_size_key" ON "ProductPrice"("productId", "size");

-- AddForeignKey
ALTER TABLE "ProductPrice" ADD CONSTRAINT "ProductPrice_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data: ililipat ang dating presyo bago burahin ang mga column.
-- Drinks: ang dating "regular" ay Iced (16oz), ang upsize ay Upsize (22oz). Iba pa: isang presyo (REGULAR).
INSERT INTO "ProductPrice" ("productId", "size", "price")
SELECT p."id", CASE WHEN c."group" = 'DRINKS' THEN 'ICED'::"ProductSize" ELSE 'REGULAR'::"ProductSize" END, p."currentPrice"
FROM "Product" p JOIN "Category" c ON c."id" = p."categoryId";

INSERT INTO "ProductPrice" ("productId", "size", "price")
SELECT p."id", 'UPSIZE'::"ProductSize", p."upsizePrice"
FROM "Product" p
WHERE p."upsizePrice" IS NOT NULL;

-- Itugma ang lumang history ng drinks sa Iced
UPDATE "ProductPriceHistory" h SET "size" = 'ICED'
FROM "Product" p JOIN "Category" c ON c."id" = p."categoryId"
WHERE h."productId" = p."id" AND c."group" = 'DRINKS' AND h."size" = 'REGULAR';

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "currentPrice",
DROP COLUMN "upsizePrice";

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "size" "ProductSize" NOT NULL DEFAULT 'REGULAR';