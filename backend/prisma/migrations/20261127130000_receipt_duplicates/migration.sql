-- Two people in a household photographing the same paper receipt: its
-- number (FİŞ NO) and a link to the earlier receipt it repeats.

-- AlterTable
ALTER TABLE "Receipt" ADD COLUMN     "duplicateOfId" UUID,
ADD COLUMN     "receiptNo" TEXT;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "Receipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
