// apps/api/src/messages/messages.bot.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiBotService } from '../bot/ai-bot.service';
import { formatHistoryLine } from '../bot/ai-bot.format';
import { MessagesRealtime } from './messages.realtime';

type MinimalMessage = {
  id: string;
  channelId: string;
  authorId: string;
  content: string | null;
  createdAt: Date;
  mentions?: any[];
};

@Injectable()
export class MessagesBotOrchestrator {
  constructor(
    private prisma: PrismaService,
    private rt: MessagesRealtime,
    private aiBot: AiBotService,
  ) {}

  async maybeRespond(params: {
    msg: MinimalMessage;
    botId: string;
    isGeneral: boolean;
    isCommand: boolean;
    botMentioned: boolean;
    lastReadOverride?: string | null;
    createBotMessage: (channelId: string, content: string) => Promise<any>;
  }): Promise<void> {
    const { msg, botId, isGeneral, isCommand, botMentioned } = params;

    if (!isGeneral) return;
    if (!(isCommand || botMentioned)) return;
    if (msg.authorId === botId) return;

    // fire-and-forget style; caller can `void this.bot.maybeRespond(...)`
    this.rt.emitTyping({
      channelId: msg.channelId,
      userId: botId,
      displayName: 'BambooBob',
      isTyping: true,
    });

    try {
      const cleanedUser = (msg.content ?? '')
        .replaceAll(`@BambooBob`, '')
        .trim()
        .toLowerCase();

      const wantsSummary =
        cleanedUser.includes('samenvat') ||
        cleanedUser.includes('samenvatting') ||
        cleanedUser.includes('samenvatten') ||
        cleanedUser.includes('summarize') ||
        cleanedUser.includes('summary') ||
        cleanedUser.includes('tldr');

      const wantsSinceLastRead =
        cleanedUser.includes('wat heb ik gemist') ||
        cleanedUser.includes('wat mis ik') ||
        cleanedUser.includes('since last read') ||
        cleanedUser.includes('what did i miss') ||
        cleanedUser.includes('missed') ||
        cleanedUser.includes('did i miss') ||
        cleanedUser.includes('miss something');

      // resolve lastRead
      const read = await this.prisma.channelRead.findUnique({
        where: {
          userId_channelId: {
            userId: msg.authorId,
            channelId: msg.channelId,
          },
        },
        select: { lastRead: true },
      });

      const overrideDate =
        typeof params.lastReadOverride === 'string' && params.lastReadOverride
          ? new Date(params.lastReadOverride)
          : null;

      const lastRead = overrideDate ?? read?.lastRead ?? null;
      const cutoff = msg.createdAt;

      // NOT clause
      const notClause: any[] = [{ id: msg.id }];
      if (wantsSinceLastRead) {
        notClause.push({ authorId: msg.authorId }); // exclude requester
        notClause.push({ authorId: botId }); // exclude bot messages
      }

      const whereBase: any = {
        channelId: msg.channelId,
        deletedAt: null,
        NOT: notClause,
      };

      const where = wantsSummary
        ? {
            ...whereBase,
            createdAt: { lte: cutoff },
          }
        : lastRead
          ? {
              ...whereBase,
              createdAt: { gt: lastRead, lte: cutoff },
            }
          : {
              ...whereBase,
              createdAt: { lte: cutoff },
            };

      // For summary we need latest 50 (desc), then reverse for chronological
      const raw = await this.prisma.message.findMany({
        where,
        orderBy: { createdAt: wantsSummary ? 'desc' : 'asc' },
        take: 50,
        select: {
          createdAt: true,
          content: true,
          author: { select: { displayName: true } },
          parent: { select: { author: { select: { displayName: true } } } },
          mentions: { select: { user: { select: { displayName: true } } } },
        },
      });

      const context = wantsSummary ? raw.reverse() : raw;

      const history = context
        .map((m) => formatHistoryLine(m as any))
        .join('\n');

      const botReply = await this.aiBot.onUserMessage({
        channelId: msg.channelId,
        authorId: msg.authorId,
        content: msg.content ?? '',
        isBotMentioned: isCommand ? false : botMentioned,
        history,
        lastRead,
        lastReadOverride: overrideDate,
      });

      if (!botReply?.reply?.trim()) return;

      // mark as read ONLY for "what did I miss"
      if (wantsSinceLastRead) {
        await this.prisma.channelRead.upsert({
          where: {
            userId_channelId: {
              userId: msg.authorId,
              channelId: msg.channelId,
            },
          },
          update: { lastRead: cutoff },
          create: {
            userId: msg.authorId,
            channelId: msg.channelId,
            lastRead: cutoff,
          },
        });
      }

      // post bot reply as message
      await params.createBotMessage(msg.channelId, botReply.reply);
    } catch (err) {
      // keep behavior: warn but don't crash message create path
      // eslint-disable-next-line no-console
      console.warn('[bot] failed to generate reply', err);
    } finally {
      this.rt.emitTyping({
        channelId: msg.channelId,
        userId: botId,
        displayName: 'BambooBob',
        isTyping: false,
      });
    }
  }
  async generateDigestForChannel(
    channelId: string,
    hours = 24,
  ): Promise<string> {
    return this.aiBot.generateDigestForChannel(channelId, hours);
  }
}
