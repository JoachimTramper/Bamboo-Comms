import { MessageContextType } from '@prisma/client';
import { AiAssistantService } from './ai-assistant.service';

describe('AiAssistantService', () => {
  const prisma = {
    user: { findFirst: jest.fn() },
    message: { findMany: jest.fn() },
  } as any;

  const digest = {
    ensure: jest.fn(),
  } as any;

  const aiChat = {
    hasApiKey: jest.fn(),
    chat: jest.fn(),
  } as any;

  const knowledgeBase = {
    retrieveRelevantSnippets: jest.fn(),
  } as any;

  let service: AiAssistantService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findFirst.mockResolvedValue({ id: 'bot-1' });
    aiChat.hasApiKey.mockReturnValue(true);
    aiChat.chat.mockResolvedValue('assistant reply');
    knowledgeBase.retrieveRelevantSnippets.mockResolvedValue([]);
    service = new AiAssistantService(prisma, digest, aiChat, knowledgeBase);
  });

  it('generates a reply without requiring a bot mention', async () => {
    const result = await service.generateReply({
      scope: { conversationId: 'conv-1' },
      authorId: 'user-1',
      content: 'Please summarize this thread',
      history: '[2026-04-01 10:00] Alex: Hello',
      lastRead: null,
    });

    expect(result).toEqual({ reply: 'assistant reply' });
    expect(aiChat.chat).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({
        conversationId: 'conv-1',
        channelId: undefined,
        mode: 'summary',
      }),
      expect.any(Function),
    );
  });

  it('returns a local message when there is nothing new since last read', async () => {
    const result = await service.generateReply({
      scope: { conversationId: 'conv-2' },
      authorId: 'user-1',
      content: 'What did I miss since last read?',
      history: '',
      lastRead: new Date('2026-04-01T10:00:00.000Z'),
    });

    expect(result).toEqual({ reply: 'Nothing new since your last read.' });
    expect(aiChat.chat).not.toHaveBeenCalled();
  });

  it('injects retrieved knowledge snippets into the prompt when available', async () => {
    knowledgeBase.retrieveRelevantSnippets.mockResolvedValue([
      'Billing settings. Update payment methods from Settings > Billing.',
    ]);

    await service.generateReply({
      scope: { conversationId: 'conv-3' },
      authorId: 'user-1',
      content: 'How do I update billing?',
      history: '[2026-04-01 10:00] Alex: Need help',
      lastRead: null,
    });

    expect(knowledgeBase.retrieveRelevantSnippets).toHaveBeenCalledWith({
      query: 'How do I update billing?',
      conversationId: 'conv-3',
      limit: 4,
    });

    expect(aiChat.chat).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'user',
          content: expect.stringContaining('Knowledge snippets:'),
        }),
      ]),
      expect.any(Object),
      expect.any(Function),
    );
  });

  it('generates a support draft for agent users from conversation context', async () => {
    knowledgeBase.retrieveRelevantSnippets.mockResolvedValue([
      'Invoices. Customers can review billing totals from Settings > Billing.',
      'Taxes. Invoice totals may include taxes based on the billing profile.',
    ]);
    prisma.message.findMany.mockResolvedValue([
      {
        channelId: 'chan-1',
        createdAt: new Date('2026-04-02T10:00:00.000Z'),
        content: 'My invoice total looks wrong.',
        messageType: MessageContextType.CUSTOMER,
        author: { displayName: 'Customer' },
        parent: null,
        mentions: [],
        conversation: {
          id: 'conv-1',
          subject: 'Invoice issue',
          priority: 'NORMAL',
          isEscalated: false,
          customer: {
            name: 'Taylor',
            email: 'taylor@example.com',
            company: 'Northwind',
            planTier: 'Pro',
          },
        },
      },
    ]);
    (prisma as any).channel = {
      findUnique: jest.fn().mockResolvedValue({
        id: 'chan-1',
        name: 'support',
        isDirect: false,
        members: [],
      }),
    };

    const result = await service.generateSupportDraft(
      'conv-1',
      { sub: 'agent-1', email: 'agent@example.com', subjectType: 'user' },
      'Keep it brief.',
    );

    expect(result).toEqual({
      conversationId: 'conv-1',
      draft: 'assistant reply',
      generatedAt: expect.any(String),
      confidence: 'MEDIUM',
      confidenceHint: expect.any(String),
    });
    expect(knowledgeBase.retrieveRelevantSnippets).toHaveBeenCalledWith({
      query: 'My invoice total looks wrong.',
      conversationId: 'conv-1',
      limit: 4,
    });
    expect(aiChat.chat).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'user',
          content: expect.stringContaining('Latest customer message: My invoice total looks wrong.'),
        }),
      ]),
      expect.objectContaining({
        channelId: 'chan-1',
        conversationId: 'conv-1',
      }),
      expect.any(Function),
    );
  });
});
