/*
  Warnings:

  - A unique constraint covering the columns `[dmKey]` on the table `Channel` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Channel" ADD COLUMN     "dmKey" TEXT;

-- CreateTable
CREATE TABLE "_ChannelMembers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ChannelMembers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ChannelMembers_B_index" ON "_ChannelMembers"("B");

-- CreateIndex
CREATE UNIQUE INDEX "Channel_dmKey_key" ON "Channel"("dmKey");

-- AddForeignKey
ALTER TABLE "_ChannelMembers" ADD CONSTRAINT "_ChannelMembers_A_fkey" FOREIGN KEY ("A") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChannelMembers" ADD CONSTRAINT "_ChannelMembers_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
