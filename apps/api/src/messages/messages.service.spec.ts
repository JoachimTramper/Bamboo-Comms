import { MessageContextType } from '@prisma/client';
import { MessagesService } from './messages.service';

describe('MessagesService', () => {
  let service: MessagesService;
  let prisma: any;
  let rt: any;
  let bot: any;
  let assistant: any;

  beforeEach(() => {
    prisma = {
      user: {
        findFirst: jest.fn(),
      },
      channel: {
        findUnique: jest.fn(),
      },
      conversation: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      message: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      channelRead: {
        upsert: jest.fn(),
      },
      messageReaction: {
        upsert: jest.fn(),
        delete: jest.fn(),
      },
    };

    rt = {
      emitMessageCreated: jest.fn(),
      emitUnreadDelta: jest.fn(),
      emitMessageUpdated: jest.fn(),
      emitMessageDeleted: jest.fn(),
      emitReactionAdded: jest.fn(),
      emitReactionRemoved: jest.fn(),
    };

    bot = {
      maybeRespond: jest.fn(),
      generateDigestForChannel: jest.fn(),
    };

    assistant = {
      generateReply: jest.fn(),
    };

    service = new MessagesService(prisma, rt, bot, assistant);
  });

  it('stores conversation customer messages with support semantics', async () => {
    prisma.channel.findUnique.mockImplementation(({ select }: any) => {
      if (select?.members) {
        return Promise.resolve({
          id: 'chan-1',
          name: 'support',
          isDirect: false,
          members: [],
        });
      }

      return Promise.resolve({
        id: 'chan-1',
        members: [],
      });
    });

    prisma.conversation.findUnique
      .mockResolvedValueOnce({ id: 'conv-1' })
      .mockResolvedValueOnce({
        lastCustomerMessageAt: null,
      })
      .mockResolvedValueOnce({
        id: 'conv-1',
        firstResponseAt: null,
        lastCustomerMessageAt: null,
      });

    prisma.user.findFirst.mockResolvedValue(null);
    prisma.message.create.mockResolvedValue({
      id: 'msg-1',
      channelId: 'chan-1',
      conversationId: 'conv-1',
      messageType: MessageContextType.CUSTOMER,
      responseTimeMs: null,
      authorId: 'cust-1',
      content: 'I need help with billing',
      createdAt: new Date('2026-04-01T10:00:00.000Z'),
      author: {
        id: 'cust-1',
        displayName: 'Customer',
        avatarUrl: null,
      },
      parent: null,
      reactions: [],
      mentions: [],
      attachments: [],
    });

    await service.create(
      'chan-1',
      { sub: 'cust-1', email: 'c@example.com', subjectType: 'customer' },
      'I need help with billing',
      'conv-1',
    );

    expect(prisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          conversationId: 'conv-1',
          messageType: MessageContextType.CUSTOMER,
        }),
      }),
    );
    expect(prisma.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'conv-1' },
        data: expect.objectContaining({
          lastMessageAt: expect.any(Date),
          lastCustomerMessageAt: expect.any(Date),
        }),
      }),
    );
    expect(bot.maybeRespond).not.toHaveBeenCalled();
  });

  it('keeps legacy channel chat messages on the bot path', async () => {
    prisma.channel.findUnique.mockImplementation(({ select }: any) => {
      if (select?.name) {
        return Promise.resolve({
          id: 'general-1',
          name: 'general',
          isDirect: false,
          members: [{ id: 'user-1' }],
        });
      }

      return Promise.resolve({
        id: 'general-1',
        members: [{ id: 'user-2' }],
      });
    });

    prisma.user.findFirst.mockResolvedValue({ id: 'bot-1' });
    prisma.message.create.mockResolvedValue({
      id: 'msg-2',
      channelId: 'general-1',
      conversationId: null,
      messageType: MessageContextType.CHAT,
      responseTimeMs: null,
      authorId: 'user-1',
      content: '@BambooBob summarize',
      createdAt: new Date('2026-04-01T10:05:00.000Z'),
      author: {
        id: 'user-1',
        displayName: 'Agent',
        avatarUrl: null,
      },
      parent: null,
      reactions: [],
      mentions: [{ userId: 'bot-1', user: { id: 'bot-1', displayName: 'BambooBob', avatarUrl: null } }],
      attachments: [],
    });

    await service.create(
      'general-1',
      { sub: 'user-1', email: 'agent@example.com', subjectType: 'user' },
      '@BambooBob summarize',
      undefined,
      undefined,
      undefined,
      ['bot-1'],
    );

    expect(prisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          messageType: MessageContextType.CHAT,
        }),
      }),
    );
    expect(bot.maybeRespond).toHaveBeenCalled();
  });

  it('uses the assistant for conversation customer messages without weakening auth rules', async () => {
    prisma.channel.findUnique.mockImplementation(({ select }: any) => {
      if (select?.name) {
        return Promise.resolve({
          id: 'chan-2',
          name: 'support',
          isDirect: false,
          members: [],
        });
      }

      return Promise.resolve({
        id: 'chan-2',
        members: [],
      });
    });

    prisma.user.findFirst.mockResolvedValue({ id: 'bot-1' });

    prisma.conversation.findUnique
      .mockResolvedValueOnce({ id: 'conv-2' })
      .mockResolvedValueOnce({
        id: 'conv-2',
        firstResponseAt: null,
        lastCustomerMessageAt: null,
      })
      .mockResolvedValueOnce({
        lastCustomerMessageAt: new Date('2026-04-01T10:00:00.000Z'),
      })
      .mockResolvedValueOnce({
        id: 'conv-2',
        firstResponseAt: null,
        lastCustomerMessageAt: new Date('2026-04-01T10:00:00.000Z'),
      });

    prisma.message.create
      .mockResolvedValueOnce({
        id: 'msg-customer',
        channelId: 'chan-2',
        conversationId: 'conv-2',
        messageType: MessageContextType.CUSTOMER,
        responseTimeMs: null,
        authorId: 'cust-1',
        content: 'I cannot update my billing details',
        createdAt: new Date('2026-04-01T10:00:00.000Z'),
        author: {
          id: 'cust-1',
          displayName: 'Customer',
          avatarUrl: null,
        },
        parent: null,
        reactions: [],
        mentions: [],
        attachments: [],
      })
      .mockResolvedValueOnce({
        id: 'msg-assistant',
        channelId: 'chan-2',
        conversationId: 'conv-2',
        messageType: MessageContextType.ASSISTANT,
        responseTimeMs: 5000,
        authorId: 'bot-1',
        content: 'Please open Settings > Billing and try again.',
        createdAt: new Date('2026-04-01T10:00:05.000Z'),
        author: {
          id: 'bot-1',
          displayName: 'BambooBob',
          avatarUrl: null,
        },
        parent: null,
        reactions: [],
        mentions: [],
        attachments: [],
      });

    prisma.message.findMany.mockResolvedValue([
      {
        createdAt: new Date('2026-04-01T09:58:00.000Z'),
        content: 'Earlier context',
        author: { displayName: 'Customer' },
        parent: null,
        mentions: [],
      },
    ]);

    assistant.generateReply.mockResolvedValue({
      reply: 'Please open Settings > Billing and try again.',
    });

    await service.create(
      'chan-2',
      { sub: 'cust-1', email: 'c@example.com', subjectType: 'customer' },
      'I cannot update my billing details',
      'conv-2',
    );

    await new Promise((resolve) => setImmediate(resolve));

    expect(assistant.generateReply).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: {
          channelId: 'chan-2',
          conversationId: 'conv-2',
        },
        authorId: 'cust-1',
        content: 'I cannot update my billing details',
      }),
    );

    expect(prisma.message.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          channelId: 'chan-2',
          conversationId: 'conv-2',
          messageType: MessageContextType.ASSISTANT,
          authorId: 'bot-1',
        }),
      }),
    );

    expect(bot.maybeRespond).not.toHaveBeenCalled();
  });
});
