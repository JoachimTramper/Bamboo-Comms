export type AssistantContextScope = {
  channelId?: string | null;
  conversationId?: string | null;
};

export type GenerateAssistantReplyParams = {
  scope?: AssistantContextScope;
  authorId: string;
  content: string;
  history: string;
  lastRead: Date | null;
  lastReadOverride?: Date | null;
  knowledgeContext?: string[];
  assistantName?: string;
};
