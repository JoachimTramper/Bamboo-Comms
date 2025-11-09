import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

type JwtPayload = { sub: string; email: string };

@WebSocketGateway({ cors: { origin: '*' } })
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  // presence state
  private socketToUser = new Map<string, { userId: string }>(); // socket.id -> userId
  private userToSockets = new Map<string, Set<string>>(); // userId -> set(socket.id)

  private async getUserSafe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, displayName: true, lastSeen: true },
    });
  }

  private async sendPresenceSnapshot(to: Socket) {
    // who is online (>=1 socket)
    const onlineUserIds = [...this.userToSockets.entries()]
      .filter(([_, sockets]) => sockets.size > 0)
      .map(([userId]) => userId);

    const online = await this.prisma.user.findMany({
      where: { id: { in: onlineUserIds } },
      select: { id: true, displayName: true, lastSeen: true },
      orderBy: { displayName: 'asc' },
    });

    // recent offline users (not online, but lastSeen), most recent first
    const recently = await this.prisma.user.findMany({
      where: { id: { notIn: onlineUserIds }, lastSeen: { not: null } },
      select: { id: true, displayName: true, lastSeen: true },
      orderBy: { lastSeen: 'desc' },
      take: 20,
    });

    to.emit('presence.snapshot', { online, recently });
  }

  private async broadcastPresenceUpdate(userId: string, isOnline: boolean) {
    const user = await this.getUserSafe(userId);
    if (!user) return;
    this.server.emit('presence.update', { user, isOnline });
  }

  async handleConnection(client: Socket) {
    try {
      const raw =
        (client.handshake.auth as any)?.token ||
        (client.handshake.headers['authorization'] as string | undefined);

      const token = raw?.startsWith('Bearer ') ? raw.slice(7) : raw || '';
      if (!token) throw new Error('Missing token');

      const payload = this.jwt.verify(token, {
        secret: process.env.JWT_SECRET!,
      }) as JwtPayload;

      (client as any).user = payload;

      // track socket
      const userId = payload.sub;
      this.socketToUser.set(client.id, { userId });

      const set = this.userToSockets.get(userId) ?? new Set<string>();
      const wasOffline = set.size === 0;
      set.add(client.id);
      this.userToSockets.set(userId, set);

      // snapshot to client
      await this.sendPresenceSnapshot(client);

      // just came online? broadcast
      if (wasOffline) {
        await this.broadcastPresenceUpdate(userId, true);
      }
    } catch {
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    const entry = this.socketToUser.get(client.id);
    if (!entry) return;

    const { userId } = entry;
    this.socketToUser.delete(client.id);

    const set = this.userToSockets.get(userId);
    if (!set) return;

    set.delete(client.id);

    if (set.size === 0) {
      // fully offline -> update lastSeen
      this.userToSockets.delete(userId);
      try {
        await this.prisma.user.update({
          where: { id: userId },
          data: { lastSeen: new Date() },
        });
      } catch (e) {
        console.warn('[presence] failed to update lastSeen', e);
      }
      await this.broadcastPresenceUpdate(userId, false);
    } else {
      this.userToSockets.set(userId, set);
    }
  }

  // Backend calls this after a create to push full payload
  async emitMessageCreated(payload: { id: string }) {
    const msg = await this.prisma.message.findUnique({
      where: { id: payload.id },
      include: { author: { select: { id: true, displayName: true } } },
    });
    if (msg) this.server.emit('message.created', msg);
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { channelId: string; isTyping: boolean },
  ) {
    const u = (client as any).user as JwtPayload | undefined;
    if (!u) return;

    const user = await this.getUserSafe(u.sub);
    if (!user) return;

    this.server.emit('typing', {
      channelId: body.channelId,
      userId: user.id,
      displayName: user.displayName,
      isTyping: !!body.isTyping,
    });
  }
}
