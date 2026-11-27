-- Households: the people who share one home share its receipts, shelf,
-- at-home counts, lists and spending. Everyone gets their own household,
-- with the same id as their account, and their data moves into it.

-- CreateTable
CREATE TABLE "Household" (
    "id" UUID NOT NULL,
    "inviteCode" TEXT,
    "inviteExpiresAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Household" ("id", "createdAt") SELECT "id", "createdAt" FROM "User";

-- User
ALTER TABLE "User" ADD COLUMN "householdId" UUID;
UPDATE "User" SET "householdId" = "id";
ALTER TABLE "User" ALTER COLUMN "householdId" SET NOT NULL;

-- Receipt: belongs to the household; userId stays as who scanned it.
ALTER TABLE "Receipt" DROP CONSTRAINT "Receipt_userId_fkey";
DROP INDEX "Receipt_userId_sha256_key";
DROP INDEX "Receipt_userId_status_issuedAt_idx";
ALTER TABLE "Receipt" ADD COLUMN "householdId" UUID;
UPDATE "Receipt" SET "householdId" = "userId";
ALTER TABLE "Receipt" ALTER COLUMN "householdId" SET NOT NULL,
ALTER COLUMN "userId" DROP NOT NULL;

-- ShoppingList
ALTER TABLE "ShoppingList" DROP CONSTRAINT "ShoppingList_userId_fkey";
DROP INDEX "ShoppingList_userId_idx";
ALTER TABLE "ShoppingList" ADD COLUMN "householdId" UUID;
UPDATE "ShoppingList" SET "householdId" = "userId";
ALTER TABLE "ShoppingList" ALTER COLUMN "householdId" SET NOT NULL;
ALTER TABLE "ShoppingList" DROP COLUMN "userId";

-- HomeItem
ALTER TABLE "HomeItem" DROP CONSTRAINT "HomeItem_userId_fkey";
DROP INDEX "HomeItem_userId_normalizedName_key";
ALTER TABLE "HomeItem" ADD COLUMN "householdId" UUID;
UPDATE "HomeItem" SET "householdId" = "userId";
ALTER TABLE "HomeItem" ALTER COLUMN "householdId" SET NOT NULL;
ALTER TABLE "HomeItem" DROP COLUMN "userId";

-- CreateIndex
CREATE UNIQUE INDEX "Household_inviteCode_key" ON "Household"("inviteCode");
CREATE UNIQUE INDEX "HomeItem_householdId_normalizedName_key" ON "HomeItem"("householdId", "normalizedName");
CREATE INDEX "Receipt_householdId_status_issuedAt_idx" ON "Receipt"("householdId", "status", "issuedAt");
CREATE UNIQUE INDEX "Receipt_householdId_sha256_key" ON "Receipt"("householdId", "sha256");
CREATE INDEX "ShoppingList_householdId_idx" ON "ShoppingList"("householdId");
CREATE INDEX "User_householdId_idx" ON "User"("householdId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ShoppingList" ADD CONSTRAINT "ShoppingList_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HomeItem" ADD CONSTRAINT "HomeItem_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
