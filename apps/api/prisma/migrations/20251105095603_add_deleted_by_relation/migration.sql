/*
  Warnings:

  - Added the required column `updatedAt` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- AlterTable
ALTER TABLE "Message"
  ADD COLUMN "deletedAt"   TIMESTAMP(3),
  ADD COLUMN "deletedById" TEXT,
  ADD COLUMN "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT NOW();

-- AlterTable
ALTER TABLE "User"
  ADD COLUMN "role" "Role" NOT NULL DEFAULT 'USER';

-- CreateIndex
CREATE INDEX "Message_channelId_deletedAt_idx" ON "Message"("channelId", "deletedAt");

-- AddForeignKey
ALTER TABLE "Message"
  ADD CONSTRAINT "Message_deletedById_fkey"
  FOREIGN KEY ("deletedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- (Optional) after backfilling, you can drop the default if you prefer Prisma to set it:
-- ALTER TABLE "Message" ALTER COLUMN "updatedAt" DROP DEFAULT;
