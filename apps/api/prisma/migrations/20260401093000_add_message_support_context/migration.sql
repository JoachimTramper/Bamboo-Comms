CREATE TYPE "MessageContextType" AS ENUM (
  'CHAT',
  'CUSTOMER',
  'AGENT',
  'INTERNAL_NOTE',
  'ASSISTANT'
);

ALTER TABLE "Message"
ADD COLUMN "messageType" "MessageContextType" NOT NULL DEFAULT 'CHAT',
ADD COLUMN "responseTimeMs" INTEGER;

ALTER TABLE "Conversation"
ADD COLUMN "lastCustomerMessageAt" TIMESTAMP(3),
ADD COLUMN "lastSupportReplyAt" TIMESTAMP(3),
ADD COLUMN "firstResponseAt" TIMESTAMP(3);

CREATE INDEX "Message_conversationId_messageType_createdAt_idx"
ON "Message"("conversationId", "messageType", "createdAt" DESC);
