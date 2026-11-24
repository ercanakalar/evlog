-- Records what each saved receipt added at home, so deleting it can take it back.

-- AlterTable
ALTER TABLE "HomeItem" ADD COLUMN     "lastMatchReceiptId" UUID;

-- AlterTable
ALTER TABLE "Receipt" ADD COLUMN     "homeCountsRecorded" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "HomeItemChange" (
    "id" UUID NOT NULL,
    "homeItemId" UUID NOT NULL,
    "receiptId" UUID NOT NULL,
    "receiptItemId" UUID NOT NULL,
    "amount" DECIMAL(10,3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HomeItemChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HomeItemChange_receiptId_idx" ON "HomeItemChange"("receiptId");

-- CreateIndex
CREATE INDEX "HomeItemChange_homeItemId_idx" ON "HomeItemChange"("homeItemId");

-- AddForeignKey
ALTER TABLE "HomeItemChange" ADD CONSTRAINT "HomeItemChange_homeItemId_fkey" FOREIGN KEY ("homeItemId") REFERENCES "HomeItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeItemChange" ADD CONSTRAINT "HomeItemChange_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeItemChange" ADD CONSTRAINT "HomeItemChange_receiptItemId_fkey" FOREIGN KEY ("receiptItemId") REFERENCES "ReceiptItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

