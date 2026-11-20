-- Brands (filled from the built-in list on start) and the brand and pack size of each receipt line.

-- AlterTable
ALTER TABLE "ReceiptItem" ADD COLUMN     "brandId" UUID,
ADD COLUMN     "packAmount" DECIMAL(10,3),
ADD COLUMN     "packUnit" TEXT;

-- CreateTable
CREATE TABLE "Brand" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "keywords" TEXT[],

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Brand_name_key" ON "Brand"("name");

-- CreateIndex
CREATE INDEX "ReceiptItem_brandId_idx" ON "ReceiptItem"("brandId");

-- AddForeignKey
ALTER TABLE "ReceiptItem" ADD CONSTRAINT "ReceiptItem_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

