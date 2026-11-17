-- CreateEnum
CREATE TYPE "TenancyStatus" AS ENUM ('INVITED', 'ACTIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "ConditionSessionType" AS ENUM ('MOVE_IN', 'MOVE_OUT', 'PERIODIC');

-- CreateEnum
CREATE TYPE "ConditionSessionStatus" AS ENUM ('OPEN', 'LOCKED', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "Room" AS ENUM ('LIVING_ROOM', 'KITCHEN', 'BEDROOM', 'BATHROOM', 'BALCONY', 'HALLWAY', 'METERS', 'OTHER');

-- CreateEnum
CREATE TYPE "ReceiptKind" AS ENUM ('GROCERY', 'RENT', 'UTILITY_ELECTRICITY', 'UTILITY_WATER', 'UTILITY_GAS', 'UTILITY_INTERNET', 'RENOVATION', 'APPLIANCE', 'SERVICE', 'OTHER');

-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('PENDING', 'PROCESSING', 'PARSED', 'FAILED', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "RatingCategory" AS ENUM ('HOME_CONDITION', 'NEIGHBORHOOD', 'INFRASTRUCTURE', 'HEATING_EFFICIENCY', 'RENOVATIONS');

-- CreateEnum
CREATE TYPE "ListingProvider" AS ENUM ('SAHIBINDEN');

-- CreateEnum
CREATE TYPE "ListingType" AS ENUM ('RENT', 'SALE');

-- CreateEnum
CREATE TYPE "ApplianceType" AS ENUM ('COMBI_BOILER', 'DISHWASHER', 'WASHING_MACHINE', 'DRYER', 'AIR_CONDITIONER', 'REFRIGERATOR', 'OVEN', 'WATER_HEATER', 'WATER_PURIFIER', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

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
CREATE TABLE "Home" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "neighborhood" TEXT,
    "addressLine" TEXT NOT NULL,
    "roomLayout" TEXT NOT NULL,
    "areaM2" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Home_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenancy" (
    "id" UUID NOT NULL,
    "homeId" UUID NOT NULL,
    "tenantId" UUID,
    "inviteCode" TEXT,
    "status" "TenancyStatus" NOT NULL DEFAULT 'INVITED',
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "verifiedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Tenancy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConditionSession" (
    "id" UUID NOT NULL,
    "homeId" UUID NOT NULL,
    "tenancyId" UUID,
    "createdById" UUID NOT NULL,
    "type" "ConditionSessionType" NOT NULL,
    "status" "ConditionSessionStatus" NOT NULL DEFAULT 'OPEN',
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMPTZ(3),
    "contentHash" TEXT,
    "ownerConfirmedAt" TIMESTAMPTZ(3),
    "tenantConfirmedAt" TIMESTAMPTZ(3),

    CONSTRAINT "ConditionSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConditionPhoto" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "uploadedById" UUID NOT NULL,
    "room" "Room" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "capturedAt" TIMESTAMPTZ(3) NOT NULL,
    "receivedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "note" TEXT,

    CONSTRAINT "ConditionPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receipt" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "homeId" UUID,
    "kind" "ReceiptKind" NOT NULL,
    "status" "ReceiptStatus" NOT NULL DEFAULT 'PENDING',
    "imageKey" TEXT NOT NULL,
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
    "normalizedName" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL DEFAULT 1,
    "unit" TEXT,
    "unitPrice" DECIMAL(12,2),
    "totalPrice" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "ReceiptItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rating" (
    "id" UUID NOT NULL,
    "homeId" UUID NOT NULL,
    "tenancyId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "noteForNextTenant" TEXT,
    "submittedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RatingScore" (
    "id" UUID NOT NULL,
    "ratingId" UUID NOT NULL,
    "category" "RatingCategory" NOT NULL,
    "score" SMALLINT NOT NULL,

    CONSTRAINT "RatingScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RatingEvidence" (
    "id" UUID NOT NULL,
    "scoreId" UUID NOT NULL,
    "receiptId" UUID,
    "conditionSessionId" UUID,

    CONSTRAINT "RatingEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" UUID NOT NULL,
    "homeId" UUID NOT NULL,
    "provider" "ListingProvider" NOT NULL,
    "externalId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "ListingType" NOT NULL DEFAULT 'RENT',
    "title" TEXT,
    "priceAmount" DECIMAL(14,2),
    "currency" CHAR(3) NOT NULL DEFAULT 'TRY',
    "coverPhotoId" UUID,
    "lastSyncedAt" TIMESTAMPTZ(3),
    "syncError" TEXT,
    "sharePhotos" BOOLEAN NOT NULL DEFAULT true,
    "shareRatings" BOOLEAN NOT NULL DEFAULT true,
    "shareHeatingBills" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrokerAccess" (
    "id" UUID NOT NULL,
    "listingId" UUID NOT NULL,
    "agencyName" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),
    "lastViewAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrokerAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingUpdate" (
    "id" UUID NOT NULL,
    "listingId" UUID NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PantryItem" (
    "id" UUID NOT NULL,
    "homeId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "usualDurationDays" INTEGER,
    "packSize" DECIMAL(10,3),
    "unit" TEXT,
    "lastPurchasedAt" TIMESTAMPTZ(3),
    "purchaseCount" INTEGER NOT NULL DEFAULT 0,
    "trackLow" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PantryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShoppingListItem" (
    "id" UUID NOT NULL,
    "homeId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "doneAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShoppingListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricePoint" (
    "id" UUID NOT NULL,
    "receiptItemId" UUID NOT NULL,
    "homeId" UUID,
    "normalizedName" TEXT NOT NULL,
    "merchantName" TEXT,
    "unit" TEXT,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'TRY',
    "city" TEXT,
    "observedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PricePoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appliance" (
    "id" UUID NOT NULL,
    "homeId" UUID NOT NULL,
    "type" "ApplianceType" NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "purchasedAt" DATE,
    "warrantyUntil" DATE,
    "receiptId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Appliance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceTask" (
    "id" UUID NOT NULL,
    "applianceId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "intervalDays" INTEGER NOT NULL,
    "lastDoneAt" TIMESTAMPTZ(3),
    "nextDueAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceLog" (
    "id" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "doneById" UUID NOT NULL,
    "doneAt" TIMESTAMPTZ(3) NOT NULL,
    "note" TEXT,
    "receiptId" UUID,

    CONSTRAINT "MaintenanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");

-- CreateIndex
CREATE INDEX "Home_ownerId_idx" ON "Home"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Tenancy_inviteCode_key" ON "Tenancy"("inviteCode");

-- CreateIndex
CREATE INDEX "Tenancy_homeId_status_idx" ON "Tenancy"("homeId", "status");

-- CreateIndex
CREATE INDEX "Tenancy_tenantId_idx" ON "Tenancy"("tenantId");

-- CreateIndex
CREATE INDEX "ConditionSession_homeId_startedAt_idx" ON "ConditionSession"("homeId", "startedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ConditionPhoto_storageKey_key" ON "ConditionPhoto"("storageKey");

-- CreateIndex
CREATE INDEX "ConditionPhoto_sessionId_room_idx" ON "ConditionPhoto"("sessionId", "room");

-- CreateIndex
CREATE UNIQUE INDEX "ConditionPhoto_sessionId_sha256_key" ON "ConditionPhoto"("sessionId", "sha256");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_imageKey_key" ON "Receipt"("imageKey");

-- CreateIndex
CREATE INDEX "Receipt_homeId_kind_issuedAt_idx" ON "Receipt"("homeId", "kind", "issuedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_userId_sha256_key" ON "Receipt"("userId", "sha256");

-- CreateIndex
CREATE INDEX "ReceiptItem_normalizedName_idx" ON "ReceiptItem"("normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "ReceiptItem_receiptId_position_key" ON "ReceiptItem"("receiptId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Rating_tenancyId_key" ON "Rating"("tenancyId");

-- CreateIndex
CREATE INDEX "Rating_homeId_idx" ON "Rating"("homeId");

-- CreateIndex
CREATE UNIQUE INDEX "RatingScore_ratingId_category_key" ON "RatingScore"("ratingId", "category");

-- CreateIndex
CREATE INDEX "RatingEvidence_scoreId_idx" ON "RatingEvidence"("scoreId");

-- CreateIndex
CREATE INDEX "Listing_homeId_idx" ON "Listing"("homeId");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_provider_externalId_key" ON "Listing"("provider", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "BrokerAccess_tokenHash_key" ON "BrokerAccess"("tokenHash");

-- CreateIndex
CREATE INDEX "BrokerAccess_listingId_idx" ON "BrokerAccess"("listingId");

-- CreateIndex
CREATE INDEX "ListingUpdate_listingId_createdAt_idx" ON "ListingUpdate"("listingId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "PantryItem_homeId_normalizedName_key" ON "PantryItem"("homeId", "normalizedName");

-- CreateIndex
CREATE INDEX "ShoppingListItem_homeId_doneAt_idx" ON "ShoppingListItem"("homeId", "doneAt");

-- CreateIndex
CREATE INDEX "PricePoint_normalizedName_observedAt_idx" ON "PricePoint"("normalizedName", "observedAt" DESC);

-- CreateIndex
CREATE INDEX "PricePoint_homeId_normalizedName_observedAt_idx" ON "PricePoint"("homeId", "normalizedName", "observedAt" DESC);

-- CreateIndex
CREATE INDEX "Appliance_homeId_idx" ON "Appliance"("homeId");

-- CreateIndex
CREATE INDEX "MaintenanceTask_nextDueAt_idx" ON "MaintenanceTask"("nextDueAt");

-- CreateIndex
CREATE INDEX "MaintenanceLog_taskId_doneAt_idx" ON "MaintenanceLog"("taskId", "doneAt" DESC);

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Home" ADD CONSTRAINT "Home_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenancy" ADD CONSTRAINT "Tenancy_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenancy" ADD CONSTRAINT "Tenancy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConditionSession" ADD CONSTRAINT "ConditionSession_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConditionSession" ADD CONSTRAINT "ConditionSession_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConditionSession" ADD CONSTRAINT "ConditionSession_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConditionPhoto" ADD CONSTRAINT "ConditionPhoto_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ConditionSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConditionPhoto" ADD CONSTRAINT "ConditionPhoto_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptItem" ADD CONSTRAINT "ReceiptItem_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RatingScore" ADD CONSTRAINT "RatingScore_ratingId_fkey" FOREIGN KEY ("ratingId") REFERENCES "Rating"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RatingEvidence" ADD CONSTRAINT "RatingEvidence_scoreId_fkey" FOREIGN KEY ("scoreId") REFERENCES "RatingScore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RatingEvidence" ADD CONSTRAINT "RatingEvidence_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrokerAccess" ADD CONSTRAINT "BrokerAccess_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingUpdate" ADD CONSTRAINT "ListingUpdate_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PantryItem" ADD CONSTRAINT "PantryItem_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingListItem" ADD CONSTRAINT "ShoppingListItem_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricePoint" ADD CONSTRAINT "PricePoint_receiptItemId_fkey" FOREIGN KEY ("receiptItemId") REFERENCES "ReceiptItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appliance" ADD CONSTRAINT "Appliance_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appliance" ADD CONSTRAINT "Appliance_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTask" ADD CONSTRAINT "MaintenanceTask_applianceId_fkey" FOREIGN KEY ("applianceId") REFERENCES "Appliance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceLog" ADD CONSTRAINT "MaintenanceLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "MaintenanceTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceLog" ADD CONSTRAINT "MaintenanceLog_doneById_fkey" FOREIGN KEY ("doneById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceLog" ADD CONSTRAINT "MaintenanceLog_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
