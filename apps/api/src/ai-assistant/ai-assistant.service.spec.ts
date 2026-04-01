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

  let service: AiAssistantService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findFirst.mockResolvedValue({ id: 'bot-1' });
    aiChat.hasApiKey.mockReturnValue(true);
    aiChat.chat.mockResolvedValue('assistant reply');
    service = new AiAssistantService(prisma, digest, aiChat);
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
});
