-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'MODERATOR');

-- CreateEnum
CREATE TYPE "ReportTarget" AS ENUM ('RATING', 'CONDITION_PHOTO', 'LISTING');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('OFFENSIVE', 'PERSONAL_DATA', 'FALSE_INFORMATION', 'SPAM', 'ILLEGAL', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'DISMISSED', 'ACTIONED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER';

-- AlterTable
ALTER TABLE "ConditionPhoto" ADD COLUMN     "hiddenAt" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "Rating" ADD COLUMN     "hiddenAt" TIMESTAMPTZ(3),
ADD COLUMN     "noteHiddenAt" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "hiddenAt" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "Report" (
    "id" UUID NOT NULL,
    "reporterId" UUID,
    "brokerAccessId" UUID,
    "targetType" "ReportTarget" NOT NULL,
    "targetId" UUID NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "details" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedById" UUID,
    "resolvedAt" TIMESTAMPTZ(3),
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Report_targetType_targetId_idx" ON "Report"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "Report_reporterId_targetType_targetId_key" ON "Report"("reporterId", "targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "Report_brokerAccessId_targetType_targetId_key" ON "Report"("brokerAccessId", "targetType", "targetId");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_brokerAccessId_fkey" FOREIGN KEY ("brokerAccessId") REFERENCES "BrokerAccess"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

