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

  const conversationRecord = {
    id: 'conv-1',
    subject: 'Billing issue',
    status: ConversationStatus.OPEN,
    priority: ConversationPriority.NORMAL,
    tags: [],
    isEscalated: false,
    escalationReason: null,
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
        update: jest.fn(),
      },
      customer: {
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    };

    realtime = {
      emitConversationUpdated: jest.fn(),
      emitConversationAssigned: jest.fn(),
      emitConversationStatusUpdated: jest.fn(),
    };

    service = new ConversationsService(prisma, realtime);
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
});
