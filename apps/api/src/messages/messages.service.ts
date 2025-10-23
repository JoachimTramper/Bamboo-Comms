// apps/api/src/messages/messages.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WsGateway } from '../ws/ws.gateway';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private ws: WsGateway,
  ) {}

  list(channelId: string, take = 50, cursor?: string) {
    return this.prisma.message.findMany({
      where: { channelId },
      orderBy: { createdAt: 'desc' },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: { author: { select: { id: true, displayName: true } } },
    });
  }

  async create(channelId: string, authorId: string, content?: string) {
    const exists = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });
    if (!exists) throw new NotFoundException('Channel not found');

    const msg = await this.prisma.message.create({
      data: { channelId, authorId, content },
    });

    // realtime push via gateway (die haalt author + payload zelf op)
    await this.ws.emitMessageCreated({ id: msg.id });

    return msg;
  }
}
