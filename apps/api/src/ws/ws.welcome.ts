// apps/api/src/ws/ws.welcome.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Server } from 'socket.io';

@Injectable()
export class WsWelcomeService {
  constructor(private prisma: PrismaService) {}

  private welcomed = new Set<string>(); // `${channelId}:${userId}`

  async maybeWelcome(params: {
    server: Server;
    channelId: string;
    userId: string;
    isGeneral: boolean;
  }) {
    const { server, channelId, userId, isGeneral } = params;
    if (!isGeneral) return;

    const key = `${channelId}:${userId}`;
    if (this.welcomed.has(key)) return;
    this.welcomed.add(key);

    const botId = await this.getBotUserId();
    if (!botId) return;

    const alreadyWelcomed = await this.hasWelcomeMessage(
      channelId,
      userId,
      botId,
    );
    if (alreadyWelcomed) return;

    await this.postWelcome(server, channelId, userId, botId);
  }

  private async getBotUserId() {
    const bot = await this.prisma.user.findFirst({
      where: { email: 'bot@ai.local' },
      select: { id: true },
    });
    return bot?.id ?? null;
  }

  private async hasWelcomeMessage(
    channelId: string,
    userId: string,
    botId: string,
  ) {
    const exists = await this.prisma.message.findFirst({
      where: {
        channelId,
        authorId: botId,
        content: { contains: `[welcome: ${userId}]` },
        deletedAt: null,
      },
      select: { id: true },
    });
    return !!exists;
  }

  private async postWelcome(
    server: Server,
    channelId: string,
    userId: string,
    botId: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, displayName: true, avatarUrl: true },
    });
    if (!user) return;

    const msg = await this.prisma.message.create({
      data: {
        channelId,
        authorId: botId,
        content: `👋 Welcome ${user.displayName}! Type \`!help\` for commands. [welcome: ${userId}]`,
      },
      select: {
        id: true,
        channelId: true,
        content: true,
        createdAt: true,
        author: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });

    server.to(`view:${channelId}`).emit('message.created', {
      id: msg.id,
      channelId: msg.channelId,
      content: msg.content,
      createdAt: msg.createdAt.toISOString(),
      author: {
        id: msg.author.id,
        displayName: msg.author.displayName,
        avatarUrl: msg.author.avatarUrl ?? null,
      },
    });
  }
}
