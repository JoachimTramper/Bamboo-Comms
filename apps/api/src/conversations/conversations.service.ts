import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ConversationPriority,
  ConversationStatus,
  type Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { ListConversationsDto } from './dto/list-conversations.dto';
import { ConversationLifecycleAction } from './dto/transition-conversation.dto';

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

@Injectable()
export class ConversationsService {
  constructor(private prisma: PrismaService) {}

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

    const conversation = await this.prisma.conversation.create({
      data: {
        subject: dto.subject?.trim() || null,
        status: dto.status ?? ConversationStatus.OPEN,
        priority: dto.priority ?? ConversationPriority.NORMAL,
        customerId: dto.customerId ?? null,
        assigneeId: dto.assigneeId ?? null,
        tags: this.normalizeTags(dto.tags),
      },
      include: CONVERSATION_INCLUDE,
    });

    return this.serializeConversation(conversation);
  }

  async updateConversation(id: string, dto: UpdateConversationDto) {
    await this.getConversationById(id);
    await this.ensureReferences(dto.customerId, dto.assigneeId);

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
          dto.assigneeId === undefined ? undefined : dto.assigneeId || null,
        tags: dto.tags === undefined ? undefined : this.normalizeTags(dto.tags),
        resolvedAt:
          dto.status === undefined
            ? undefined
            : dto.status === ConversationStatus.RESOLVED
              ? new Date()
              : null,
      },
      include: CONVERSATION_INCLUDE,
    });

    return this.serializeConversation(conversation);
  }

  async updateConversationStatus(id: string, status: ConversationStatus) {
    await this.getConversationById(id);

    const conversation = await this.prisma.conversation.update({
      where: { id },
      data: {
        status,
        resolvedAt: status === ConversationStatus.RESOLVED ? new Date() : null,
      },
      include: CONVERSATION_INCLUDE,
    });

    return this.serializeConversation(conversation);
  }

  async assignConversation(id: string, assigneeId?: string) {
    await this.getConversationById(id);
    await this.ensureReferences(undefined, assigneeId);

    const conversation = await this.prisma.conversation.update({
      where: { id },
      data: { assigneeId: assigneeId || null },
      include: CONVERSATION_INCLUDE,
    });

    return this.serializeConversation(conversation);
  }

  async transitionConversation(
    id: string,
    action: ConversationLifecycleAction,
  ) {
    switch (action) {
      case ConversationLifecycleAction.OPEN:
      case ConversationLifecycleAction.REOPEN:
        return this.updateConversationStatus(id, ConversationStatus.OPEN);
      case ConversationLifecycleAction.PENDING:
        return this.updateConversationStatus(id, ConversationStatus.PENDING);
      case ConversationLifecycleAction.RESOLVE:
        return this.updateConversationStatus(id, ConversationStatus.RESOLVED);
      case ConversationLifecycleAction.CLOSE:
        return this.updateConversationStatus(id, ConversationStatus.CLOSED);
      default:
        throw new BadRequestException(
          'Unsupported conversation lifecycle action',
        );
    }
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
        select: { id: true },
      });

      if (!assignee) {
        throw new BadRequestException('Assignee not found');
      }
    }
  }
}
