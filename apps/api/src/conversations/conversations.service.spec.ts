import {
  ConversationPriority,
  ConversationStatus,
  Role,
} from '@prisma/client';
import { ConversationsService } from './conversations.service';
import { ConversationLifecycleAction } from './dto/transition-conversation.dto';

describe('ConversationsService', () => {
  let service: ConversationsService;
  let prisma: any;
  let realtime: any;
  let messages: any;

  const conversationRecord = {
    id: 'conv-1',
    subject: 'Billing issue',
    status: ConversationStatus.OPEN,
    priority: ConversationPriority.NORMAL,
    tags: [],
    isEscalated: false,
    escalationReason: null,
    escalationTarget: null,
    createdAt: new Date('2026-04-02T10:00:00.000Z'),
    updatedAt: new Date('2026-04-02T10:05:00.000Z'),
    lastMessageAt: null,
    lastCustomerMessageAt: null,
    lastSupportReplyAt: null,
    firstResponseAt: null,
    resolvedAt: null,
    escalatedAt: null,
    customerId: null,
    assigneeId: null,
    escalatedById: null,
    customer: null,
    assignee: null,
    escalatedBy: null,
    messages: [],
    _count: { messages: 0 },
  };

  beforeEach(() => {
    prisma = {
      conversation: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
      },
      channel: {
        create: jest.fn(),
      },
      channelRead: {
        createMany: jest.fn(),
      },
      customer: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        create: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
    };

    realtime = {
      emitConversationUpdated: jest.fn(),
      emitConversationCreated: jest.fn(),
      emitConversationAssigned: jest.fn(),
      emitConversationStatusUpdated: jest.fn(),
      emitConversationEscalated: jest.fn(),
    };

    messages = {
      createCustomerConversationSeedMessage: jest.fn(),
    };

    service = new ConversationsService(prisma, realtime, messages);
  });

  it('allows OPEN to move to PENDING and broadcasts the status change', async () => {
    prisma.conversation.findUnique.mockResolvedValueOnce({
      ...conversationRecord,
      status: ConversationStatus.OPEN,
    });
    prisma.conversation.update.mockResolvedValue({
      ...conversationRecord,
      status: ConversationStatus.PENDING,
    });

    const result = await service.updateConversationStatus(
      'conv-1',
      ConversationStatus.PENDING,
    );

    expect(prisma.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'conv-1' },
        data: expect.objectContaining({
          status: ConversationStatus.PENDING,
          resolvedAt: null,
        }),
      }),
    );
    expect(realtime.emitConversationStatusUpdated).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'conv-1',
        status: ConversationStatus.PENDING,
        previousStatus: ConversationStatus.OPEN,
      }),
    );
    expect(result.status).toBe(ConversationStatus.PENDING);
  });

  it('rejects invalid forward transitions on the status endpoint', async () => {
    prisma.conversation.findUnique.mockResolvedValue({
      ...conversationRecord,
      status: ConversationStatus.OPEN,
    });

    await expect(
      service.updateConversationStatus('conv-1', ConversationStatus.RESOLVED),
    ).rejects.toThrow('Invalid status transition from OPEN to RESOLVED');

    expect(prisma.conversation.update).not.toHaveBeenCalled();
  });

  it('allows admins to close an open conversation through the status endpoint', async () => {
    prisma.conversation.findUnique.mockResolvedValueOnce({
      ...conversationRecord,
      status: ConversationStatus.OPEN,
    });
    prisma.conversation.update.mockResolvedValue({
      ...conversationRecord,
      status: ConversationStatus.CLOSED,
    });

    const result = await service.updateConversationStatus(
      'conv-1',
      ConversationStatus.CLOSED,
    );

    expect(prisma.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'conv-1' },
        data: expect.objectContaining({
          status: ConversationStatus.CLOSED,
          resolvedAt: null,
        }),
      }),
    );
    expect(realtime.emitConversationStatusUpdated).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'conv-1',
        status: ConversationStatus.CLOSED,
        previousStatus: ConversationStatus.OPEN,
      }),
    );
    expect(result.status).toBe(ConversationStatus.CLOSED);
  });

  it('requires assignees to be agent users', async () => {
    prisma.conversation.findUnique.mockResolvedValue({
      ...conversationRecord,
      status: ConversationStatus.OPEN,
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: Role.USER,
    });

    await expect(service.assignConversation('conv-1', 'user-1')).rejects.toThrow(
      'Assignee must be an agent user',
    );

    expect(prisma.conversation.update).not.toHaveBeenCalled();
  });

  it('persists assignment changes and emits an assignment event', async () => {
    prisma.conversation.findUnique.mockResolvedValue({
      ...conversationRecord,
      status: ConversationStatus.OPEN,
      assigneeId: null,
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 'agent-1',
      role: Role.ADMIN,
    });
    prisma.conversation.update.mockResolvedValue({
      ...conversationRecord,
      assigneeId: 'agent-1',
      assignee: {
        id: 'agent-1',
        email: 'agent@example.com',
        displayName: 'Agent',
        role: Role.ADMIN,
      },
    });

    const result = await service.assignConversation('conv-1', 'agent-1');

    expect(prisma.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'conv-1' },
        data: { assigneeId: 'agent-1' },
      }),
    );
    expect(realtime.emitConversationAssigned).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'conv-1',
        assigneeId: 'agent-1',
      }),
    );
    expect(result.assigneeId).toBe('agent-1');
  });

  it('supports reopening through the lifecycle endpoint', async () => {
    prisma.conversation.findUnique
      .mockResolvedValueOnce({
        ...conversationRecord,
        status: ConversationStatus.RESOLVED,
      })
      .mockResolvedValueOnce({
        ...conversationRecord,
        status: ConversationStatus.RESOLVED,
      });
    prisma.conversation.update.mockResolvedValue({
      ...conversationRecord,
      status: ConversationStatus.OPEN,
      resolvedAt: null,
    });

    const result = await service.transitionConversation(
      'conv-1',
      ConversationLifecycleAction.REOPEN,
    );

    expect(prisma.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ConversationStatus.OPEN,
          resolvedAt: null,
        }),
      }),
    );
    expect(result.status).toBe(ConversationStatus.OPEN);
  });

  it('stores manual escalation state and reason for agent actors', async () => {
    prisma.conversation.findUnique.mockResolvedValue({
      ...conversationRecord,
      isEscalated: false,
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 'agent-1',
      role: Role.ADMIN,
    });
    prisma.conversation.update.mockResolvedValue({
      ...conversationRecord,
      isEscalated: true,
      escalationReason: 'Needs supervisor review',
      escalationTarget: 'SUPERVISOR_REVIEW',
      escalatedAt: new Date('2026-04-03T10:00:00.000Z'),
      escalatedById: 'agent-1',
      escalatedBy: {
        id: 'agent-1',
        email: 'agent@example.com',
        displayName: 'Agent',
        role: Role.ADMIN,
      },
    });

    const result = await service.updateConversation(
      'conv-1',
      {
        isEscalated: true,
        escalationReason: 'Needs supervisor review',
      },
      {
        sub: 'agent-1',
        email: 'agent@example.com',
        subjectType: 'user',
      },
    );

    expect(prisma.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'conv-1' },
        data: expect.objectContaining({
          isEscalated: true,
          escalationReason: 'Needs supervisor review',
          escalatedById: 'agent-1',
        }),
      }),
    );
    expect(result.isEscalated).toBe(true);
    expect(result.escalationReason).toBe('Needs supervisor review');
  });

  it('clears escalation safely when escalationReason is null', async () => {
    prisma.conversation.findUnique.mockResolvedValue({
      ...conversationRecord,
      isEscalated: true,
      escalationReason: 'Needs supervisor review',
      escalatedAt: new Date('2026-04-03T10:00:00.000Z'),
      escalatedById: 'agent-1',
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 'agent-1',
      role: Role.ADMIN,
    });
    prisma.conversation.update.mockResolvedValue({
      ...conversationRecord,
      isEscalated: false,
      escalationReason: null,
      escalationTarget: null,
      escalatedAt: null,
      escalatedById: null,
      escalatedBy: null,
    });

    const result = await service.updateConversation(
      'conv-1',
      {
        isEscalated: false,
        escalationReason: null as any,
      },
      {
        sub: 'agent-1',
        email: 'agent@example.com',
        subjectType: 'user',
      },
    );

    expect(prisma.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'conv-1' },
        data: expect.objectContaining({
          isEscalated: false,
          escalationReason: null,
          escalatedAt: null,
          escalatedById: null,
        }),
      }),
    );
    expect(result.isEscalated).toBe(false);
    expect(result.escalationReason).toBeNull();
  });

  it('auto-escalates when priority becomes urgent', async () => {
    prisma.conversation.findUnique.mockResolvedValue({
      ...conversationRecord,
      priority: ConversationPriority.NORMAL,
      isEscalated: false,
    });
    prisma.conversation.update.mockResolvedValue({
      ...conversationRecord,
      priority: ConversationPriority.URGENT,
      isEscalated: true,
      escalationTarget: 'SUPERVISOR_REVIEW',
      escalatedAt: new Date('2026-04-03T11:00:00.000Z'),
      escalatedById: null,
      escalatedBy: null,
    });

    const result = await service.updateConversation('conv-1', {
      priority: ConversationPriority.URGENT,
    });

    expect(prisma.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          priority: ConversationPriority.URGENT,
          isEscalated: true,
          escalationTarget: 'SUPERVISOR_REVIEW',
        }),
      }),
    );
    expect(realtime.emitConversationEscalated).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'conv-1',
        isEscalated: true,
        escalationTarget: 'SUPERVISOR_REVIEW',
      }),
    );
    expect(result.isEscalated).toBe(true);
  });

  it('creates a customer-linked conversation with an initial customer message', async () => {
    prisma.user.findUnique.mockResolvedValue({
      email: 'customer@example.com',
      displayName: 'Customer User',
    });
    prisma.conversation.findFirst.mockResolvedValue(null);
    prisma.user.findMany.mockResolvedValue([{ id: 'agent-1' }]);
    prisma.customer.findUnique.mockResolvedValue({ id: 'cust-1' });
    prisma.customer.upsert.mockResolvedValue({ id: 'cust-1' });
    prisma.conversation.create.mockResolvedValue({
      ...conversationRecord,
      id: 'conv-customer-1',
      subject: 'Support request from customer@example.com',
      customerId: 'cust-1',
      customer: {
        id: 'cust-1',
        email: 'customer@example.com',
        name: 'Customer User',
        company: null,
        planTier: null,
        createdAt: new Date('2026-04-03T12:00:00.000Z'),
        updatedAt: new Date('2026-04-03T12:00:00.000Z'),
      },
    });
    prisma.channel.create.mockResolvedValue({ id: 'support-chan-1' });
    prisma.channelRead.createMany.mockResolvedValue({ count: 2 });
    messages.createCustomerConversationSeedMessage.mockResolvedValue({
      id: 'msg-1',
      conversationId: 'conv-customer-1',
    });
    prisma.conversation.findUnique.mockResolvedValue({
      ...conversationRecord,
      id: 'conv-customer-1',
      subject: 'Support request from customer@example.com',
      customerId: 'cust-1',
      customer: {
        id: 'cust-1',
        email: 'customer@example.com',
        name: 'Customer User',
        company: null,
        planTier: null,
        createdAt: new Date('2026-04-03T12:00:00.000Z'),
        updatedAt: new Date('2026-04-03T12:00:00.000Z'),
      },
      messages: [
        {
          id: 'msg-1',
          content: 'My invoice total looks wrong.',
          createdAt: new Date('2026-04-03T12:05:00.000Z'),
          channelId: 'support-chan-1',
          author: {
            id: 'user-1',
            displayName: 'Customer User',
          },
        },
      ],
      _count: { messages: 1 },
    });

    const result = await service.createCustomerConversation(
      {
        sub: 'user-1',
        email: 'customer@example.com',
        subjectType: 'user',
      },
      { message: 'My invoice total looks wrong.' },
    );

    expect(prisma.customer.upsert).toHaveBeenCalledWith({
      where: { email: 'customer@example.com' },
      update: { name: 'Customer User' },
      create: {
        email: 'customer@example.com',
        name: 'Customer User',
      },
      select: { id: true },
    });
    expect(prisma.conversation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subject: 'Support request from customer@example.com',
          customerId: 'cust-1',
          status: ConversationStatus.OPEN,
          priority: ConversationPriority.NORMAL,
        }),
      }),
    );
    expect(prisma.channel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isDirect: true,
        }),
      }),
    );
    expect(messages.createCustomerConversationSeedMessage).toHaveBeenCalledWith(
      'support-chan-1',
      {
        sub: 'user-1',
        email: 'customer@example.com',
        subjectType: 'user',
      },
      'My invoice total looks wrong.',
      'conv-customer-1',
    );
    expect(realtime.emitConversationCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'conv-customer-1',
        customerId: 'cust-1',
        messageCount: 1,
      }),
    );
    expect(result.customerId).toBe('cust-1');
  });

  it('blocks customers from creating a second open support conversation', async () => {
    prisma.user.findUnique.mockResolvedValue({
      email: 'customer@example.com',
      displayName: 'Customer User',
    });
    prisma.customer.upsert.mockResolvedValue({ id: 'cust-1' });
    prisma.conversation.findFirst.mockResolvedValue({ id: 'conv-open-1' });

    await expect(
      service.createCustomerConversation(
        {
          sub: 'user-1',
          email: 'customer@example.com',
          subjectType: 'user',
        },
        { message: 'I need another thread.' },
      ),
    ).rejects.toThrow(
      'You already have an open support conversation. Please use the existing thread before starting another.',
    );

    expect(prisma.conversation.create).not.toHaveBeenCalled();
    expect(messages.createCustomerConversationSeedMessage).not.toHaveBeenCalled();
  });

  it('returns only the current customer conversations for non-admin users', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({
      email: 'customer@example.com',
      role: Role.USER,
    });
    prisma.customer.findUnique.mockResolvedValue({
      id: 'cust-1',
    });
    prisma.conversation.findMany.mockResolvedValue([
      {
        ...conversationRecord,
        id: 'conv-customer-1',
        customerId: 'cust-1',
      },
    ]);

    const result = await service.listConversations(
      {},
      {
        sub: 'user-1',
        email: 'customer@example.com',
        subjectType: 'user',
      },
    );

    expect(prisma.conversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          customerId: 'cust-1',
        }),
      }),
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('conv-customer-1');
  });

  it('blocks non-admin users from loading another customer conversation', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({
      email: 'customer@example.com',
      role: Role.USER,
    });
    prisma.customer.findUnique.mockResolvedValue({
      id: 'cust-1',
    });
    prisma.conversation.findUnique.mockResolvedValue({
      ...conversationRecord,
      id: 'conv-other',
      customerId: 'cust-2',
    });

    await expect(
      service.getConversationById('conv-other', {
        sub: 'user-1',
        email: 'customer@example.com',
        subjectType: 'user',
      }),
    ).rejects.toThrow('Conversation not found');
  });
});
