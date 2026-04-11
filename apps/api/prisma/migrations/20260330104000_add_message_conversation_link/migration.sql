ALTER TABLE "Message"
ADD COLUMN "conversationId" TEXT;

CREATE INDEX "Message_conversationId_createdAt_idx"
ON "Message"("conversationId", "createdAt" DESC);

ALTER TABLE "Message"
ADD CONSTRAINT "Message_conversationId_fkey"
FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
