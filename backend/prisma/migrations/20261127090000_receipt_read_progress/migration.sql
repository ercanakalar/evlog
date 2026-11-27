-- How many photos a receipt has and how many are read, so the app can show progress.

-- AlterTable
ALTER TABLE "Receipt" ADD COLUMN     "partCount" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "partsRead" INTEGER NOT NULL DEFAULT 0;

-- Receipts sent before: count their photos; finished ones are read through.
UPDATE "Receipt" SET "partCount" = GREATEST(cardinality("imageKeys"), 1);
UPDATE "Receipt" SET "partsRead" = "partCount" WHERE "status" NOT IN ('PENDING', 'PROCESSING');
