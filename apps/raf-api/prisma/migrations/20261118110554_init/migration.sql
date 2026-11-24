-- CreateEnum
CREATE TYPE "Category" AS ENUM ('DAIRY_EGGS', 'MEAT_FISH', 'FRUIT_VEG', 'BAKERY', 'PANTRY', 'DRINKS', 'HOUSEHOLD', 'OTHER');

-- CreateEnum
CREATE TYPE "Storage" AS ENUM ('FRIDGE', 'FREEZER', 'PANTRY');

-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('PENDING', 'PROCESSING', 'PARSED', 'FAILED', 'CONFIRMED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "googleSub" TEXT,
    "fullName" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'TRY',
    "expiryReminders" BOOLEAN NOT NULL DEFAULT true,
    "reminderLeadDays" INTEGER NOT NULL DEFAULT 2,
    "trackHomeItems" BOOLEAN NOT NULL DEFAULT true,
    "countFromReceipts" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShelfLife" (
    "id" UUID NOT NULL,
    "keyword" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "storage" "Storage" NOT NULL,
    "shelfLifeDays" INTEGER,
    "openedShelfLifeDays" INTEGER,
    "source" TEXT NOT NULL,

    CONSTRAINT "ShelfLife_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receipt" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "ReceiptStatus" NOT NULL DEFAULT 'PENDING',
    "imageKeys" TEXT[],
    "mimeType" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "merchantName" TEXT,
    "issuedAt" TIMESTAMPTZ(3),
    "totalAmount" DECIMAL(12,2),
    "currency" CHAR(3) NOT NULL DEFAULT 'TRY',
    "ocrRaw" JSONB,
    "ocrError" TEXT,
    "confirmedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceiptItem" (
    "id" UUID NOT NULL,
    "receiptId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "rawName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL DEFAULT 1,
    "unit" TEXT,
    "unitPrice" DECIMAL(12,2),
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "category" "Category" NOT NULL DEFAULT 'OTHER',
    "shelfLifeDays" INTEGER,
    "openedShelfLifeDays" INTEGER,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMPTZ(3),
    "packDate" BOOLEAN NOT NULL DEFAULT false,
    "openedAt" TIMESTAMPTZ(3),
    "usedUpAt" TIMESTAMPTZ(3),

    CONSTRAINT "ReceiptItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShoppingList" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShoppingList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShoppingListItem" (
    "id" UUID NOT NULL,
    "listId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "doneAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShoppingListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeItem" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "lastMatchAdded" INTEGER,
    "lastMatchMarket" TEXT,
    "lastMatchAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "HomeItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleSub_key" ON "User"("googleSub");

-- CreateIndex
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ShelfLife_keyword_key" ON "ShelfLife"("keyword");

-- CreateIndex
CREATE INDEX "Receipt_userId_status_issuedAt_idx" ON "Receipt"("userId", "status", "issuedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_userId_sha256_key" ON "Receipt"("userId", "sha256");

-- CreateIndex
CREATE INDEX "ReceiptItem_normalizedName_idx" ON "ReceiptItem"("normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "ReceiptItem_receiptId_position_key" ON "ReceiptItem"("receiptId", "position");

-- CreateIndex
CREATE INDEX "ShoppingList_userId_idx" ON "ShoppingList"("userId");

-- CreateIndex
CREATE INDEX "ShoppingListItem_listId_idx" ON "ShoppingListItem"("listId");

-- CreateIndex
CREATE UNIQUE INDEX "HomeItem_userId_normalizedName_key" ON "HomeItem"("userId", "normalizedName");

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptItem" ADD CONSTRAINT "ReceiptItem_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingList" ADD CONSTRAINT "ShoppingList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingListItem" ADD CONSTRAINT "ShoppingListItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES "ShoppingList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeItem" ADD CONSTRAINT "HomeItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
