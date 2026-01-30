// apps/api/src/messages/messages.service.ts
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessagesRealtime } from './messages.realtime';
import { MessagesBotOrchestrator } from './messages.bot';
import { MESSAGE_INCLUDE_FULL } from './messages.queries';

const MAX_MESSAGE_LEN = 5000;

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private rt: MessagesRealtime,
    private bot: MessagesBotOrchestrator,
  ) {}

  // ---------------------------
  // Helpers
  // ---------------------------

  private page(take = 50, cursor?: string) {
    const safeTake = Math.min(Math.max(take, 1), 100);
    return {
      take: safeTake,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    };
  }

  private guardMessageLen(content?: string) {
    const clean = (content ?? '').trim();
    if (clean.length > MAX_MESSAGE_LEN) {
      throw new ForbiddenException(
        `Message too long (max ${MAX_MESSAGE_LEN} chars)`,
      );
    }
    return clean;
  }

  private cleanIds(ids: string[]) {
    return Array.from(new Set(ids)).filter(Boolean);
  }

  private async getBotUserId() {
    const bot = await this.prisma.user.findFirst({
      where: { email: 'bot@ai.local' },
      select: { id: true },
    });
    return bot?.id ?? null;
  }

  private async resolveParentId(
    channelId: string,
    replyToMessageId?: string,
  ): Promise<string | undefined> {
    if (!replyToMessageId) return undefined;

    const parent = await this.prisma.message.findUnique({
      where: { id: replyToMessageId },
      select: { id: true, channelId: true },
    });

    if (!parent || parent.channelId !== channelId) {
      throw new ForbiddenException('Invalid reply parent');
    }

    return parent.id;
  }

  // helper to assert channel access
  private async assertCanAccessChannel(channelId: string, userId: string) {
    const ch = await this.prisma.channel.findUnique({
      where: { id: channelId },
      select: {
        id: true,
        name: true,
        isDirect: true,
        members: { where: { id: userId }, select: { id: true } },
      },
    });

    if (!ch) throw new NotFoundException('Channel not found');

    // general is always readable
    if (ch.name === 'general' && ch.isDirect === false) return;

    if (ch.isDirect && ch.members.length === 0) {
      throw new ForbiddenException('Not a channel member');
    }
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

    // channel access check (DM/private)
    await this.assertCanAccessChannel(msg.channelId, userId);

    const isOwner = msg.authorId === userId;
    const isAdmin = me?.role === 'ADMIN';
    return { isOwner, isAdmin, channelId: msg.channelId };
  }

  // helper to create bot message
  private async createBotMessage(
    channelId: string,
    content: string,
    markReadForUserId?: string,
  ) {
    const botId = await this.getBotUserId();
    if (!botId) return null;

    const msg = await this.prisma.message.create({
      data: { channelId, authorId: botId, content: content ?? '' },
      include: {
        author: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });

    if (markReadForUserId) {
      await this.prisma.channelRead.upsert({
        where: {
          userId_channelId: { userId: markReadForUserId, channelId },
        },
        update: { lastRead: msg.createdAt },
        create: {
          userId: markReadForUserId,
          channelId,
          lastRead: msg.createdAt,
        },
      });
    }

    this.rt.emitMessageCreated({
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

  // ---------------------------
  // Read
  // ---------------------------

  async list(channelId: string, userId: string, take = 50, cursor?: string) {
    await this.assertCanAccessChannel(channelId, userId);

    return this.prisma.message.findMany({
      where: { channelId },
      orderBy: { createdAt: 'desc' },
      ...this.page(take, cursor),
      include: MESSAGE_INCLUDE_FULL,
    });
  }

  async search(
    channelId: string,
    userId: string,
    query: string,
    take = 50,
    cursor?: string,
  ) {
    await this.assertCanAccessChannel(channelId, userId);

    return this.prisma.message.findMany({
      where: {
        channelId,
        deletedAt: null,
        content: { not: null, contains: query, mode: 'insensitive' },
      },
      orderBy: { createdAt: 'desc' },
      ...this.page(take, cursor),
      include: MESSAGE_INCLUDE_FULL,
    });
  }

  // ---------------------------
  // Create
  // ---------------------------

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
    lastReadOverride?: string | null,
  ) {
    await this.assertCanAccessChannel(channelId, authorId);

    const cleanContent = this.guardMessageLen(content);
    const parentId = await this.resolveParentId(channelId, replyToMessageId);
    const cleanMentions = this.cleanIds(mentionUserIds);

    const botId = await this.getBotUserId();
    const isBotMentioned = !!(botId && cleanMentions.includes(botId));

    const msg = await this.prisma.message.create({
      data: {
        channelId,
        authorId,
        content: cleanContent,
        parentId,
        mentions: { create: cleanMentions.map((userId) => ({ userId })) },
        attachments: {
          create: attachments.map((a) => ({
            url: a.url,
            fileName: a.fileName,
            mimeType: a.mimeType,
            size: a.size,
          })),
        },
      },
      include: MESSAGE_INCLUDE_FULL,
    });

    // realtime push (full payload)
    this.rt.emitMessageCreated({
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
      reactions: msg.reactions.map((r: any) => ({
        id: r.id,
        emoji: r.emoji,
        user: {
          id: r.user.id,
          displayName: r.user.displayName,
          avatarUrl: r.user.avatarUrl ?? null,
        },
      })),
      mentions: (msg.mentions ?? []).map((m: any) => ({
        userId: m.userId,
        user: {
          id: m.user.id,
          displayName: m.user.displayName,
          avatarUrl: m.user.avatarUrl ?? null,
        },
      })),
      attachments: (msg.attachments ?? []).map((a: any) => ({
        id: a.id,
        url: a.url,
        fileName: a.fileName,
        mimeType: a.mimeType,
        size: a.size,
      })),
    });

    // unread delta for everyone except sender
    const ch = await this.prisma.channel.findUnique({
      where: { id: msg.channelId },
      select: { members: { select: { id: true } } },
    });

    for (const m of ch?.members ?? []) {
      if (m.id === msg.authorId) continue;

      this.rt.emitUnreadDelta({
        userId: m.id,
        channelId: msg.channelId,
        delta: 1,
        messageId: msg.id,
        at: msg.createdAt.toISOString(),
      });
    }

    const text = (msg.content ?? '').trim();
    const isCommand = text.startsWith('!');

    const chMeta = await this.prisma.channel.findUnique({
      where: { id: msg.channelId },
      select: { name: true, isDirect: true },
    });

    const isGeneral = chMeta?.name === 'general' && chMeta?.isDirect === false;

    const botMentionedInSavedMsg = !!(
      botId &&
      (msg.mentions ?? []).some(
        (m: any) => m.userId === botId || m.user?.id === botId,
      )
    );

    // bot reply (async)
    if (botId) {
      void this.bot.maybeRespond({
        msg: {
          id: msg.id,
          channelId: msg.channelId,
          authorId: msg.authorId,
          content: msg.content ?? null,
          createdAt: msg.createdAt,
          mentions: msg.mentions as any,
        },
        botId,
        isGeneral,
        isCommand,
        botMentioned: botMentionedInSavedMsg || isBotMentioned,
        lastReadOverride,
        createBotMessage: async (chId, c) =>
          this.createBotMessage(chId, c, undefined),
      });
    }

    return msg;
  }

  // ---------------------------
  // Digest
  // ---------------------------

  async postDigestToChannel(
    channelId: string,
    opts?: { hours?: number },
  ): Promise<{ ok: true; messageId: string }> {
    const hours = opts?.hours ?? 24;

    const digestText = await this.bot.generateDigestForChannel(
      channelId,
      hours,
    );

    const msg = await this.createBotMessage(channelId, digestText);
    if (!msg) {
      throw new Error('Bot user not found (bot@ai.local). Did you run seed?');
    }

    return { ok: true, messageId: msg.id };
  }

  async hasMessagesInLastHours(
    channelId: string,
    hours: number,
  ): Promise<boolean> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const botId = await this.getBotUserId();

    const count = await this.prisma.message.count({
      where: {
        channelId,
        deletedAt: null,
        authorId: botId ? { not: botId } : undefined,
        createdAt: { gte: since },
      },
    });

    return count > 0;
  }

  // ---------------------------
  // Mutations
  // ---------------------------

  async update(messageId: string, userId: string, content: string) {
    const { isOwner, isAdmin } = await this.canMutate(messageId, userId);
    if (!isOwner && !isAdmin) throw new ForbiddenException('Not allowed');

    const cleanContent = this.guardMessageLen(content);

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { content: cleanContent },
      select: { id: true, channelId: true, content: true, updatedAt: true },
    });

    this.rt.emitMessageUpdated({
      id: updated.id,
      channelId: updated.channelId,
      content: updated.content ?? null,
      updatedAt: updated.updatedAt.toISOString(),
    });

    return updated;
  }

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

    this.rt.emitMessageDeleted({
      id: deleted.id,
      channelId,
      deletedAt: deleted.deletedAt!.toISOString(),
      deletedById: userId,
    });

    return { ok: true };
  }

  async addReaction(messageId: string, userId: string, emoji: string) {
    const trimmed = (emoji ?? '').trim();
    if (!trimmed) throw new ForbiddenException('Emoji is required');

    const msg = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, channelId: true },
    });
    if (!msg) throw new NotFoundException('Message not found');

    await this.assertCanAccessChannel(msg.channelId, userId);

    await this.prisma.messageReaction.upsert({
      where: {
        messageId_userId_emoji: { messageId, userId, emoji: trimmed },
      },
      create: { messageId, userId, emoji: trimmed },
      update: {},
    });

    this.rt.emitReactionAdded({
      messageId,
      channelId: msg.channelId,
      emoji: trimmed,
      userId,
    });

    return { ok: true };
  }

  async removeReaction(messageId: string, userId: string, emoji: string) {
    const trimmed = (emoji ?? '').trim();
    if (!trimmed) throw new ForbiddenException('Emoji is required');

    const msg = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, channelId: true },
    });
    if (!msg) throw new NotFoundException('Message not found');

    await this.assertCanAccessChannel(msg.channelId, userId);

    try {
      await this.prisma.messageReaction.delete({
        where: {
          messageId_userId_emoji: { messageId, userId, emoji: trimmed },
        },
      });
    } catch {
      // ignore if not found
    }

    this.rt.emitReactionRemoved({
      messageId,
      channelId: msg.channelId,
      emoji: trimmed,
      userId,
    });

    return { ok: true };
  }
}
