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

@Injectable()
export class ConversationsService {
  constructor(private prisma: PrismaService) {}

  async list(filters: ListConversationsDto) {
    const where: Prisma.ConversationWhereInput = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.assigneeId) {
      where.assigneeId = filters.assigneeId;
    }

    return this.prisma.conversation.findMany({
      where,
      take: filters.take ?? 50,
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        customer: true,
        assignee: {
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true,
          },
        },
      },
    });
  }

  async getById(id: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      include: {
        customer: true,
        assignee: {
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async create(dto: CreateConversationDto) {
    await this.ensureReferences(dto.customerId, dto.assigneeId);

    return this.prisma.conversation.create({
      data: {
        subject: dto.subject?.trim() || null,
        status: dto.status ?? ConversationStatus.OPEN,
        priority: dto.priority ?? ConversationPriority.NORMAL,
        customerId: dto.customerId ?? null,
        assigneeId: dto.assigneeId ?? null,
        tags: this.normalizeTags(dto.tags),
      },
      include: {
        customer: true,
        assignee: {
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true,
          },
        },
      },
    });
  }

  async update(id: string, dto: UpdateConversationDto) {
    await this.getById(id);
    await this.ensureReferences(dto.customerId, dto.assigneeId);

    return this.prisma.conversation.update({
      where: { id },
      data: {
        subject:
          dto.subject === undefined ? undefined : dto.subject.trim() || null,
        status: dto.status,
        priority: dto.priority,
        customerId: dto.customerId === undefined ? undefined : dto.customerId || null,
        assigneeId: dto.assigneeId === undefined ? undefined : dto.assigneeId || null,
        tags: dto.tags === undefined ? undefined : this.normalizeTags(dto.tags),
        resolvedAt:
          dto.status === undefined
            ? undefined
            : dto.status === ConversationStatus.RESOLVED
              ? new Date()
              : null,
      },
      include: {
        customer: true,
        assignee: {
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true,
          },
        },
      },
    });
  }

  async updateStatus(id: string, status: ConversationStatus) {
    await this.getById(id);

    return this.prisma.conversation.update({
      where: { id },
      data: {
        status,
        resolvedAt: status === ConversationStatus.RESOLVED ? new Date() : null,
      },
      include: {
        customer: true,
        assignee: {
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true,
          },
        },
      },
    });
  }

  async assign(id: string, assigneeId?: string) {
    await this.getById(id);
    await this.ensureReferences(undefined, assigneeId);

    return this.prisma.conversation.update({
      where: { id },
      data: { assigneeId: assigneeId || null },
      include: {
        customer: true,
        assignee: {
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.getById(id);
    await this.prisma.conversation.delete({ where: { id } });
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
