-- At-home products can be counted in pieces or kilograms.
-- Existing counts are whole pieces; the integer -> decimal cast keeps them.

-- CreateEnum
CREATE TYPE "HomeUnit" AS ENUM ('PIECE', 'KG');

-- AlterTable
ALTER TABLE "HomeItem" ADD COLUMN     "unit" "HomeUnit" NOT NULL DEFAULT 'PIECE',
ALTER COLUMN "count" SET DEFAULT 0,
ALTER COLUMN "count" SET DATA TYPE DECIMAL(10,3),
ALTER COLUMN "lastMatchAdded" SET DATA TYPE DECIMAL(10,3);

