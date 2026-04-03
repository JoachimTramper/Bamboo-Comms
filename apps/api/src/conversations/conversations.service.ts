import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ConversationPriority,
  ConversationStatus,
  Role,
  type Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { ListConversationsDto } from './dto/list-conversations.dto';
import { ConversationLifecycleAction } from './dto/transition-conversation.dto';
import { ConversationsRealtime } from './conversations.realtime';
import type { AuthPrincipal } from '../auth/auth.types';

const CONVERSATION_INCLUDE = {
  customer: true,
  assignee: {
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
    },
  },
  escalatedBy: {
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
    },
  },
  messages: {
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: {
      id: true,
      content: true,
      createdAt: true,
      channelId: true,
      author: {
        select: {
          id: true,
          displayName: true,
        },
      },
    },
  },
  _count: {
    select: {
      messages: true,
    },
  },
} satisfies Prisma.ConversationInclude;

type ConversationWithPreview = Prisma.ConversationGetPayload<{
  include: typeof CONVERSATION_INCLUDE;
}>;

const ALLOWED_FORWARD_STATUS_TRANSITIONS: Record<
  ConversationStatus,
  ConversationStatus[]
> = {
  [ConversationStatus.OPEN]: [ConversationStatus.OPEN, ConversationStatus.PENDING],
  [ConversationStatus.PENDING]: [
    ConversationStatus.PENDING,
    ConversationStatus.RESOLVED,
  ],
  [ConversationStatus.RESOLVED]: [
    ConversationStatus.RESOLVED,
    ConversationStatus.CLOSED,
  ],
  [ConversationStatus.CLOSED]: [ConversationStatus.CLOSED],
};

@Injectable()
export class ConversationsService {
  constructor(
    private prisma: PrismaService,
    private realtime: ConversationsRealtime,
  ) {}

  private serializeConversation(conversation: ConversationWithPreview) {
    const { messages, _count, ...rest } = conversation;
    const latestMessage = messages[0] ?? null;

    return {
      ...rest,
      primaryChannelId: latestMessage?.channelId ?? null,
      latestMessagePreview: latestMessage
        ? {
            id: latestMessage.id,
            content: latestMessage.content,
            createdAt: latestMessage.createdAt,
            channelId: latestMessage.channelId,
            author: latestMessage.author,
          }
        : null,
      messageCount: _count.messages,
    };
  }

  private assertCreateConversationInput(dto?: CreateConversationDto) {
    if (!dto) {
      throw new BadRequestException('Conversation payload is required');
    }

    const hasMeaningfulInput =
      dto.subject !== undefined ||
      dto.status !== undefined ||
      dto.priority !== undefined ||
      dto.customerId !== undefined ||
      dto.assigneeId !== undefined ||
      dto.tags !== undefined;

    if (!hasMeaningfulInput) {
      throw new BadRequestException(
        'Conversation payload must include at least one field',
      );
    }
  }

  private assertStatusTransition(
    currentStatus: ConversationStatus,
    nextStatus: ConversationStatus,
  ) {
    const allowed = ALLOWED_FORWARD_STATUS_TRANSITIONS[currentStatus] ?? [
      currentStatus,
    ];

    if (allowed.includes(nextStatus)) return;

    throw new BadRequestException(
      `Invalid status transition from ${currentStatus} to ${nextStatus}`,
    );
  }

  private resolveLifecycleTargetStatus(
    currentStatus: ConversationStatus,
    action: ConversationLifecycleAction,
  ) {
    switch (action) {
      case ConversationLifecycleAction.PENDING:
        this.assertStatusTransition(currentStatus, ConversationStatus.PENDING);
        return ConversationStatus.PENDING;
      case ConversationLifecycleAction.RESOLVE:
        this.assertStatusTransition(currentStatus, ConversationStatus.RESOLVED);
        return ConversationStatus.RESOLVED;
      case ConversationLifecycleAction.CLOSE:
        this.assertStatusTransition(currentStatus, ConversationStatus.CLOSED);
        return ConversationStatus.CLOSED;
      case ConversationLifecycleAction.OPEN:
      case ConversationLifecycleAction.REOPEN:
        if (
          currentStatus !== ConversationStatus.OPEN &&
          currentStatus !== ConversationStatus.PENDING &&
          currentStatus !== ConversationStatus.RESOLVED &&
          currentStatus !== ConversationStatus.CLOSED
        ) {
          throw new BadRequestException(
            `Cannot reopen conversation from ${currentStatus}`,
          );
        }
        return ConversationStatus.OPEN;
      default:
        throw new BadRequestException(
          'Unsupported conversation lifecycle action',
        );
    }
  }

  private async persistConversationStatusChange(params: {
    id: string;
    previousStatus: ConversationStatus;
    nextStatus: ConversationStatus;
  }) {
    if (params.previousStatus === params.nextStatus) {
      return this.getConversationById(params.id);
    }

    const conversation = await this.prisma.conversation.update({
      where: { id: params.id },
      data: {
        status: params.nextStatus,
        resolvedAt:
          params.nextStatus === ConversationStatus.RESOLVED ? new Date() : null,
      },
      include: CONVERSATION_INCLUDE,
    });

    const serialized = this.serializeConversation(conversation);
    this.realtime.emitConversationStatusUpdated({
      ...serialized,
      previousStatus: params.previousStatus,
    });

    return serialized;
  }

  private async maybeApplyUrgentAssignmentHook(params: {
    priority?: ConversationPriority;
    assigneeId?: string | null;
  }) {
    if (
      params.priority !== ConversationPriority.URGENT ||
      params.assigneeId !== undefined
    ) {
      return undefined;
    }

    // Safe placeholder for future escalation routing. No automatic reassignment
    // happens until an explicit agent-tier model exists.
    return undefined;
  }

  private async assertAgentActor(user?: AuthPrincipal) {
    if (!user || user.subjectType !== 'user') {
      throw new ForbiddenException('Escalation requires an agent actor');
    }

    const actor = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { id: true, role: true },
    });

    if (!actor || actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Escalation requires an agent actor');
    }

    return actor;
  }

  async listConversations(filters: ListConversationsDto) {
    const where: Prisma.ConversationWhereInput = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.priority) {
      where.priority = filters.priority;
    }

    if (filters.assigneeId) {
      where.assigneeId = filters.assigneeId;
    }

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.tag) {
      where.tags = { has: filters.tag.trim() };
    }

    const trimmedQuery = filters.query?.trim();
    if (trimmedQuery) {
      where.OR = [
        { subject: { contains: trimmedQuery, mode: 'insensitive' } },
        {
          customer: {
            is: {
              email: { contains: trimmedQuery, mode: 'insensitive' },
            },
          },
        },
        {
          customer: {
            is: {
              name: { contains: trimmedQuery, mode: 'insensitive' },
            },
          },
        },
        {
          assignee: {
            is: {
              displayName: { contains: trimmedQuery, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    const conversations = await this.prisma.conversation.findMany({
      where,
      take: filters.take ?? 50,
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      include: CONVERSATION_INCLUDE,
    });

    return conversations.map((conversation) =>
      this.serializeConversation(conversation),
    );
  }

  async getConversationById(id: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      include: CONVERSATION_INCLUDE,
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return this.serializeConversation(conversation);
  }

  async createConversation(dto: CreateConversationDto) {
    this.assertCreateConversationInput(dto);
    await this.ensureReferences(dto.customerId, dto.assigneeId);
    const urgentAssignment = await this.maybeApplyUrgentAssignmentHook({
      priority: dto.priority,
      assigneeId: dto.assigneeId,
    });

    const conversation = await this.prisma.conversation.create({
      data: {
        subject: dto.subject?.trim() || null,
        status: dto.status ?? ConversationStatus.OPEN,
        priority: dto.priority ?? ConversationPriority.NORMAL,
        customerId: dto.customerId ?? null,
        assigneeId: urgentAssignment ?? dto.assigneeId ?? null,
        tags: this.normalizeTags(dto.tags),
      },
      include: CONVERSATION_INCLUDE,
    });

    return this.serializeConversation(conversation);
  }

  async updateConversation(
    id: string,
    dto: UpdateConversationDto,
    actor?: AuthPrincipal,
  ) {
    const existing = await this.getConversationById(id);
    await this.ensureReferences(dto.customerId, dto.assigneeId);

    const nextStatus = dto.status ?? existing.status;
    if (dto.status !== undefined) {
      this.assertStatusTransition(existing.status, nextStatus);
    }

    const urgentAssignment = await this.maybeApplyUrgentAssignmentHook({
      priority: dto.priority ?? existing.priority,
      assigneeId: dto.assigneeId,
    });
    const isEscalationUpdate =
      dto.isEscalated !== undefined || dto.escalationReason !== undefined;
    const escalationActor = isEscalationUpdate
      ? await this.assertAgentActor(actor)
      : null;
    const nextEscalationState = dto.isEscalated ?? existing.isEscalated;
    const nextEscalationReason =
      dto.escalationReason === undefined
        ? existing.escalationReason
        : typeof dto.escalationReason === 'string'
          ? dto.escalationReason.trim() || null
          : null;

    const conversation = await this.prisma.conversation.update({
      where: { id },
      data: {
        subject:
          dto.subject === undefined ? undefined : dto.subject.trim() || null,
        status: dto.status,
        priority: dto.priority,
        customerId:
          dto.customerId === undefined ? undefined : dto.customerId || null,
        assigneeId:
          dto.assigneeId === undefined
            ? urgentAssignment === undefined
              ? undefined
              : urgentAssignment
            : dto.assigneeId || null,
        tags: dto.tags === undefined ? undefined : this.normalizeTags(dto.tags),
        isEscalated: dto.isEscalated,
        escalationReason: isEscalationUpdate
          ? nextEscalationState
            ? nextEscalationReason
            : null
          : undefined,
        escalatedAt: isEscalationUpdate
          ? nextEscalationState
            ? existing.isEscalated
              ? existing.escalatedAt
              : new Date()
            : null
          : undefined,
        escalatedById: isEscalationUpdate
          ? nextEscalationState
            ? existing.isEscalated
              ? existing.escalatedById
              : escalationActor?.id
            : null
          : undefined,
        resolvedAt:
          dto.status === undefined
            ? undefined
            : dto.status === ConversationStatus.RESOLVED
              ? new Date()
              : null,
      },
      include: CONVERSATION_INCLUDE,
    });

    const serialized = this.serializeConversation(conversation);
    let emittedRealtime = false;

    if (dto.status !== undefined && dto.status !== existing.status) {
      this.realtime.emitConversationStatusUpdated({
        ...serialized,
        previousStatus: existing.status,
      });
      emittedRealtime = true;
    }

    if (
      dto.assigneeId !== undefined &&
      (dto.assigneeId || null) !== (existing.assigneeId ?? null)
    ) {
      this.realtime.emitConversationAssigned(serialized);
      emittedRealtime = true;
    }

    if (!emittedRealtime) {
      this.realtime.emitConversationUpdated(serialized);
    }

    return serialized;
  }

  async updateConversationStatus(id: string, status: ConversationStatus) {
    const existing = await this.getConversationById(id);
    this.assertStatusTransition(existing.status, status);
    return this.persistConversationStatusChange({
      id,
      previousStatus: existing.status,
      nextStatus: status,
    });
  }

  async assignConversation(id: string, assigneeId?: string) {
    const existing = await this.getConversationById(id);
    await this.ensureReferences(undefined, assigneeId);

    if ((existing.assigneeId ?? null) === (assigneeId || null)) {
      return existing;
    }

    const conversation = await this.prisma.conversation.update({
      where: { id },
      data: { assigneeId: assigneeId || null },
      include: CONVERSATION_INCLUDE,
    });

    const serialized = this.serializeConversation(conversation);

    this.realtime.emitConversationAssigned(serialized);

    return serialized;
  }

  async transitionConversation(
    id: string,
    action: ConversationLifecycleAction,
  ) {
    const existing = await this.getConversationById(id);
    const targetStatus = this.resolveLifecycleTargetStatus(
      existing.status,
      action,
    );

    return this.persistConversationStatusChange({
      id,
      previousStatus: existing.status,
      nextStatus: targetStatus,
    });
  }

  async deleteConversation(id: string) {
    await this.getConversationById(id);
    await this.prisma.conversation.delete({ where: { id } });
  }

  // Temporary wrappers for in-flight callers during the migration.
  list(filters: ListConversationsDto) {
    return this.listConversations(filters);
  }

  getById(id: string) {
    return this.getConversationById(id);
  }

  create(dto: CreateConversationDto) {
    return this.createConversation(dto);
  }

  update(id: string, dto: UpdateConversationDto) {
    return this.updateConversation(id, dto);
  }

  updateStatus(id: string, status: ConversationStatus) {
    return this.updateConversationStatus(id, status);
  }

  assign(id: string, assigneeId?: string) {
    return this.assignConversation(id, assigneeId);
  }

  remove(id: string) {
    return this.deleteConversation(id);
  }

  private normalizeTags(tags?: string[]) {
    if (!tags) return [];

    return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
  }

  private async ensureReferences(customerId?: string, assigneeId?: string) {
    if (customerId) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
        select: { id: true },
      });

      if (!customer) {
        throw new BadRequestException('Customer not found');
      }
    }

    if (assigneeId) {
      const assignee = await this.prisma.user.findUnique({
        where: { id: assigneeId },
        select: { id: true, role: true },
      });

      if (!assignee) {
        throw new BadRequestException('Assignee not found');
      }

      if (assignee.role !== Role.ADMIN) {
        throw new BadRequestException('Assignee must be an agent user');
      }
    }
  }
}
