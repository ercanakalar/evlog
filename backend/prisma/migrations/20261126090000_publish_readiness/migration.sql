-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerifiedAt" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "AuthSession" ADD COLUMN     "rotatedAt" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "Receipt" ADD COLUMN     "language" VARCHAR(2) NOT NULL DEFAULT 'en';

-- CreateTable
CREATE TABLE "PasswordReset" (
    "userId" UUID NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "PasswordReset" ADD CONSTRAINT "PasswordReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

