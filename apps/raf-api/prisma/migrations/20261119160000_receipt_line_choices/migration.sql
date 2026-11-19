-- Per receipt line: keep a countdown for it, and whether to count it at home.

-- AlterTable
ALTER TABLE "ReceiptItem" ADD COLUMN     "countAtHome" BOOLEAN,
ADD COLUMN     "onShelf" BOOLEAN NOT NULL DEFAULT true;

