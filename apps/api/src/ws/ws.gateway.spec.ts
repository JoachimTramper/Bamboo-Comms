import { WsGateway } from './ws.gateway';

describe('WsGateway', () => {
  let gateway: WsGateway;
  let prisma: any;
  let presence: any;
  let auth: any;
  let welcome: any;

  beforeEach(() => {
    prisma = {
      channel: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      message: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      channelRead: {
        findUnique: jest.fn(),
      },
    };

    presence = {
      getOnlineWithStatus: jest.fn().mockReturnValue([]),
      getStatus: jest.fn().mockReturnValue('online'),
      markOnline: jest.fn(),
      markOffline: jest.fn(),
      touch: jest.fn(),
    };

    auth = {
      getPayload: jest.fn(),
    };

    welcome = {
      maybeWelcome: jest.fn(),
    };

    gateway = new WsGateway(prisma, presence, auth, welcome);
    (gateway as any).server = {
      emit: jest.fn(),
      to: jest.fn(),
    };
  });

  it('joins conversation rooms discovered from a channel', async () => {
    const join = jest.fn();
    const client = { join } as any;

    prisma.message.findMany.mockResolvedValue([
      { conversationId: 'conv-1' },
      { conversationId: 'conv-2' },
    ]);

    await (gateway as any).joinConversationRoomsForChannel(client, 'chan-1');

    expect(prisma.message.findMany).toHaveBeenCalledWith({
      where: {
        channelId: 'chan-1',
        conversationId: { not: null },
        deletedAt: null,
      },
      distinct: ['conversationId'],
      select: { conversationId: true },
    });
    expect(join).toHaveBeenCalledWith(['conv:conv-1', 'conv:conv-2']);
  });

  it('allows explicit conversation joins when the user can access the backing channel', async () => {
    const join = jest.fn();
    const client = {
      join,
      user: undefined,
    } as any;
    (client as any).user = { sub: 'user-1', email: 'u@example.com' };

    prisma.message.findFirst.mockResolvedValue({ channelId: 'chan-1' });
    prisma.channel.findUnique.mockResolvedValue({
      id: 'chan-1',
      name: 'support',
      isDirect: false,
      members: [{ id: 'user-1' }],
    });

    const result = await gateway.handleConversationJoin(client, {
      conversationId: 'conv-1',
    });

    expect(result).toEqual({ ok: true });
    expect(join).toHaveBeenCalledWith('conv:conv-1');
  });

  it('emits conversation typing events when a conversation id is present', async () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });
    const client = {
      to,
    } as any;
    (client as any).user = { sub: 'user-1', email: 'u@example.com' };

    prisma.message.findFirst.mockResolvedValue({ channelId: 'chan-1' });
    prisma.channel.findUnique.mockResolvedValue({
      id: 'chan-1',
      name: 'support',
      isDirect: false,
      members: [{ id: 'user-1' }],
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      displayName: 'Alex',
      lastSeen: null,
      avatarUrl: null,
    });

    await gateway.handleTyping(client, {
      conversationId: 'conv-1',
      isTyping: true,
    });

    expect(to).toHaveBeenCalledWith('conv:conv-1');
    expect(emit).toHaveBeenCalledWith('conversation.typing', {
      conversationId: 'conv-1',
      channelId: null,
      userId: 'user-1',
      displayName: 'Alex',
      isTyping: true,
    });
  });
});
