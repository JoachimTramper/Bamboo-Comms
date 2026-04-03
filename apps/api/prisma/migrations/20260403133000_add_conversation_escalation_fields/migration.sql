-- AlterTable
ALTER TABLE "Conversation"
ADD COLUMN "isEscalated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "escalationReason" TEXT,
ADD COLUMN "escalatedAt" TIMESTAMP(3),
ADD COLUMN "escalatedById" TEXT;

-- CreateIndex
CREATE INDEX "Conversation_isEscalated_status_idx" ON "Conversation"("isEscalated", "status");

-- AddForeignKey
ALTER TABLE "Conversation"
ADD CONSTRAINT "Conversation_escalatedById_fkey"
FOREIGN KEY ("escalatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
