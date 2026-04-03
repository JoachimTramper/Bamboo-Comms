import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthPrincipal } from '../auth/auth.types';

@Injectable()
export class InternalNotesService {
  constructor(private prisma: PrismaService) {}

  private get db() {
    return this.prisma as any;
  }

  private async assertAgent(user: AuthPrincipal) {
    if (user.subjectType !== 'user') {
      throw new ForbiddenException('Internal notes are only available to agents');
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { role: true },
    });

    if (dbUser?.role !== Role.ADMIN) {
      throw new ForbiddenException('Internal notes are only available to agents');
    }
  }

  private async assertConversationExists(conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
  }

  async list(conversationId: string, user: AuthPrincipal) {
    await this.assertAgent(user);
    await this.assertConversationExists(conversationId);

    const notes = await this.db.internalNote.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return notes;
  }

  async create(conversationId: string, user: AuthPrincipal, content: string) {
    await this.assertAgent(user);
    await this.assertConversationExists(conversationId);

    const trimmed = (content ?? '').trim();
    if (!trimmed) {
      throw new ForbiddenException('Internal note content is required');
    }

    return this.db.internalNote.create({
      data: {
        conversationId,
        authorId: user.sub,
        content: trimmed,
      },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async remove(conversationId: string, noteId: string, user: AuthPrincipal) {
    await this.assertAgent(user);

    const note = await this.db.internalNote.findUnique({
      where: { id: noteId },
      select: { id: true, conversationId: true },
    });

    if (!note || note.conversationId !== conversationId) {
      throw new NotFoundException('Internal note not found');
    }

    await this.db.internalNote.delete({
      where: { id: noteId },
    });
  }
}
