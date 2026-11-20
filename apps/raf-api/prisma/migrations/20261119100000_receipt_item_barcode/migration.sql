-- Barcode printed beside a receipt line, used to match pack scans to it.

-- AlterTable
ALTER TABLE "ReceiptItem" ADD COLUMN     "barcode" TEXT;

