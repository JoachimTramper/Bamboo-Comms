// apps/api/src/messages/messages.service.ts
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WsGateway } from '../ws/ws.gateway';
import { AiBotService } from '../bot/ai-bot.service';
import { AI_BOT_USER_ID } from '../bot/ai-bot.constants';
import { GENERAL_CHANNEL_ID } from '../channels.constants';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private ws: WsGateway,
    private aiBot: AiBotService,
  ) {}

  private botCooldown = new Map<string, number>(); // key -> lastTimestampMs
  private BOT_COOLDOWN_MS = 5000;

  async list(channelId: string, take = 50, cursor?: string) {
    const safeTake = Math.min(Math.max(take, 1), 100);

    return this.prisma.message.findMany({
      where: { channelId },
      orderBy: { createdAt: 'desc' },
      take: safeTake,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        deletedBy: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },

        parent: {
          select: {
            id: true,
            content: true,
            author: {
              select: { id: true, displayName: true },
            },
          },
        },

        reactions: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },

        mentions: {
          select: {
            userId: true,
            user: {
              select: {
                id: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        attachments: true,
      },
    });
  }

  async search(channelId: string, query: string, take = 50, cursor?: string) {
    const safeTake = Math.min(Math.max(take, 1), 100);

    return this.prisma.message.findMany({
      where: {
        channelId,
        deletedAt: null, // exclude soft-deleted
        content: {
          not: null,
          contains: query,
          mode: 'insensitive',
        },
      },
      orderBy: { createdAt: 'desc' },
      take: safeTake,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        deletedBy: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        parent: {
          select: {
            id: true,
            content: true,
            author: {
              select: { id: true, displayName: true },
            },
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        mentions: {
          select: {
            userId: true,
            user: {
              select: {
                id: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  }

  async create(
    channelId: string,
    authorId: string,
    content?: string,
    replyToMessageId?: string,
    mentionUserIds: string[] = [],
    attachments: {
      url: string;
      fileName: string;
      mimeType: string;
      size: number;
    }[] = [],
  ) {
    // 1) channel exists?
    const exists = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });
    if (!exists) throw new NotFoundException('Channel not found');

    // 2) parent check (optional, for replies)
    let parentId: string | undefined = undefined;
    if (replyToMessageId) {
      const parent = await this.prisma.message.findUnique({
        where: { id: replyToMessageId },
        select: { id: true, channelId: true },
      });

      if (!parent || parent.channelId !== channelId) {
        throw new ForbiddenException('Invalid reply parent');
      }

      parentId = parent.id;
    }

    // 2b) clean mentions (remove duplicates, remove falsy)
    const cleanMentions = Array.from(new Set(mentionUserIds)).filter(Boolean);

    // 2c) Check if bot is mentioned
    const isBotMentioned = cleanMentions.includes(AI_BOT_USER_ID);

    // 3) create message (incl. parent, author, reactions, mentions, attachments)
    const msg = await this.prisma.message.create({
      data: {
        channelId,
        authorId,
        content: content ?? '',
        parentId,
        mentions: {
          create: cleanMentions.map((userId) => ({ userId })),
        },
        attachments: {
          create: attachments.map((a) => ({
            url: a.url,
            fileName: a.fileName,
            mimeType: a.mimeType,
            size: a.size,
          })),
        },
      },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        parent: {
          select: {
            id: true,
            content: true,
            author: {
              select: { id: true, displayName: true },
            },
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        mentions: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        attachments: true,
      },
    });

    // 4) realtime push (full payload incl. parent + reactions + mentions + attachments)
    this.ws.server.to(channelId).emit('message.created', {
      id: msg.id,
      channelId: msg.channelId,
      authorId: msg.authorId,
      content: msg.content ?? null,
      createdAt: msg.createdAt.toISOString(),
      author: {
        id: msg.author.id,
        displayName: msg.author.displayName,
        avatarUrl: msg.author.avatarUrl ?? null,
      },
      parent: msg.parent
        ? {
            id: msg.parent.id,
            content: msg.parent.content,
            author: {
              id: msg.parent.author.id,
              displayName: msg.parent.author.displayName,
            },
          }
        : null,
      reactions: msg.reactions.map((r) => ({
        id: r.id,
        emoji: r.emoji,
        user: {
          id: r.user.id,
          displayName: r.user.displayName,
          avatarUrl: r.user.avatarUrl ?? null,
        },
      })),
      mentions: msg.mentions.map((m) => ({
        userId: m.userId,
        user: {
          id: m.user.id,
          displayName: m.user.displayName,
          avatarUrl: m.user.avatarUrl ?? null,
        },
      })),
      attachments: msg.attachments.map((a) => ({
        id: a.id,
        url: a.url,
        fileName: a.fileName,
        mimeType: a.mimeType,
        size: a.size,
      })),
    });

    const text = (msg.content ?? '').trim();
    const isCommand = text.startsWith('!');
    const isGeneral = msg.channelId === GENERAL_CHANNEL_ID;

    // 5) if bot mentioned, generate reply async
    if (
      isGeneral &&
      (isBotMentioned || isCommand) &&
      msg.authorId !== AI_BOT_USER_ID
    ) {
      const key = `${msg.channelId}:${msg.authorId}`;
      const now = Date.now();
      const last = this.botCooldown.get(key) ?? 0;

      if (now - last >= this.BOT_COOLDOWN_MS) {
        this.botCooldown.set(key, now);

        // best-effort cleanup
        if (this.botCooldown.size > 5000) {
          const cutoff = now - 60_000; // 1 min
          for (const [k, ts] of this.botCooldown) {
            if (ts < cutoff) this.botCooldown.delete(k);
          }
        }

        void (async () => {
          // bot typing ON
          this.ws.server.to(msg.channelId).emit('typing', {
            channelId: msg.channelId,
            userId: AI_BOT_USER_ID,
            displayName: 'KennyTheKommunicator',
            isTyping: true,
          });

          try {
            const context = await this.prisma.message.findMany({
              where: { channelId: msg.channelId, deletedAt: null },
              orderBy: { createdAt: 'desc' },
              take: 15,
              select: {
                content: true,
                author: { select: { displayName: true } },
              },
            });

            const history = context
              .reverse()
              .map((m) => `${m.author.displayName}: ${m.content ?? ''}`)
              .join('\n');

            const botReply = await this.aiBot.onUserMessage({
              channelId: msg.channelId,
              authorId: msg.authorId,
              content: msg.content ?? '',
              isBotMentioned,
              history,
            });

            if (!botReply) return;

            await this.createBotMessage(
              msg.channelId,
              botReply.reply,
              msg.authorId,
            );
          } catch (err) {
            console.warn('[bot] failed to generate reply', err);
          } finally {
            // bot typing OFF
            this.ws.server.to(msg.channelId).emit('typing', {
              channelId: msg.channelId,
              userId: AI_BOT_USER_ID,
              displayName: 'KennyTheKommunicator',
              isTyping: false,
            });
          }
        })();
      }
    }

    return msg;
  }

  // helper to create bot message
  private async createBotMessage(
    channelId: string,
    content: string,
    markReadForUserId?: string,
  ) {
    const msg = await this.prisma.message.create({
      data: {
        channelId,
        authorId: AI_BOT_USER_ID,
        content: content ?? '',
      },
      include: {
        author: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });

    // mark as read for the user who triggered the bot
    if (markReadForUserId) {
      await this.prisma.channelRead.upsert({
        where: {
          userId_channelId: {
            userId: markReadForUserId,
            channelId,
          },
        },
        update: { lastRead: msg.createdAt },
        create: {
          userId: markReadForUserId,
          channelId,
          lastRead: msg.createdAt,
        },
      });
    }

    this.ws.server.to(channelId).emit('message.created', {
      id: msg.id,
      channelId: msg.channelId,
      authorId: msg.authorId,
      content: msg.content ?? null,
      createdAt: msg.createdAt.toISOString(),
      author: {
        id: msg.author.id,
        displayName: msg.author.displayName,
        avatarUrl: msg.author.avatarUrl ?? null,
      },
      parent: null,
      reactions: [],
      mentions: [],
      attachments: [],
    });

    return msg;
  }

  /** helper for permissions update/delete */
  private async canMutate(messageId: string, userId: string) {
    const [msg, me] = await Promise.all([
      this.prisma.message.findUnique({
        where: { id: messageId },
        select: { authorId: true, deletedAt: true, channelId: true },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      }),
    ]);

    if (!msg) throw new NotFoundException('Message not found');
    if (msg.deletedAt) throw new ForbiddenException('Message already deleted');

    const isOwner = msg.authorId === userId;
    const isAdmin = me?.role === 'ADMIN';
    return { isOwner, isAdmin, channelId: msg.channelId };
  }

  /** edit */
  async update(messageId: string, userId: string, content: string) {
    const { isOwner, isAdmin, channelId } = await this.canMutate(
      messageId,
      userId,
    );
    if (!isOwner && !isAdmin) throw new ForbiddenException('Not allowed');

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { content },
      select: { id: true, channelId: true, content: true, updatedAt: true },
    });

    // realtime: minimal payload is enough
    this.ws.server.to(channelId).emit('message.updated', {
      id: updated.id,
      channelId,
      content: updated.content ?? null,
      updatedAt: updated.updatedAt.toISOString(),
    });

    return updated;
  }

  /** soft-delete */
  async softDelete(messageId: string, userId: string) {
    const { isOwner, isAdmin, channelId } = await this.canMutate(
      messageId,
      userId,
    );
    if (!isOwner && !isAdmin) throw new ForbiddenException('Not allowed');

    const deleted = await this.prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), deletedById: userId, content: null },
      select: { id: true, channelId: true, deletedAt: true },
    });

    this.ws.server.to(channelId).emit('message.deleted', {
      id: deleted.id,
      channelId,
      deletedAt: deleted.deletedAt!.toISOString(),
      deletedById: userId,
    });

    return { ok: true };
  }

  // add reaction
  async addReaction(messageId: string, userId: string, emoji: string) {
    const trimmed = (emoji ?? '').trim();
    if (!trimmed) {
      throw new ForbiddenException('Emoji is required');
    }

    const msg = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, channelId: true },
    });
    if (!msg) throw new NotFoundException('Message not found');

    // Ensure the same user cannot add the same emoji reaction to the same message twice
    await this.prisma.messageReaction.upsert({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji: trimmed,
        },
      },
      create: {
        messageId,
        userId,
        emoji: trimmed,
      },
      update: {},
    });

    // minimal realtime payload – frontend counts further itself
    this.ws.server.to(msg.channelId).emit('message.added', {
      messageId,
      channelId: msg.channelId,
      emoji: trimmed,
      userId,
    });

    return { ok: true };
  }

  // remove reaction
  async removeReaction(messageId: string, userId: string, emoji: string) {
    const trimmed = (emoji ?? '').trim();
    if (!trimmed) {
      throw new ForbiddenException('Emoji is required');
    }

    const msg = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, channelId: true },
    });
    if (!msg) throw new NotFoundException('Message not found');

    // best-effort delete: if not found, ignore
    try {
      await this.prisma.messageReaction.delete({
        where: {
          messageId_userId_emoji: {
            messageId,
            userId,
            emoji: trimmed,
          },
        },
      });
    } catch (e) {
      // ignore if not found
    }

    this.ws.server.to(msg.channelId).emit('message.removed', {
      messageId,
      channelId: msg.channelId,
      emoji: trimmed,
      userId,
    });

    return { ok: true };
  }
}
