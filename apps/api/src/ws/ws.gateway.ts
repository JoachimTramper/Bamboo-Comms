import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({ cors: { origin: '*' } })
export class WsGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  // Verify JWT on socket connect
  async handleConnection(client: Socket) {
    try {
      // Accept token in auth or Authorization header
      const raw =
        (client.handshake.auth as any)?.token ||
        (client.handshake.headers['authorization'] as string | undefined);

      const token = raw?.startsWith('Bearer ') ? raw.slice(7) : raw || '';
      if (!token) throw new Error('Missing token');

      const payload = this.jwt.verify(token, {
        secret: process.env.JWT_SECRET!,
      });
      // Attach the user to the socket for later use if needed
      (client as any).user = payload; // { sub, email }
    } catch {
      client.disconnect(true);
    }
  }

  // Used by the backend after creating a message to push full payload
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
    const u = (client as any).user as
      | { sub: string; email: string }
      | undefined;
    if (!u) return;

    const user = await this.prisma.user.findUnique({
      where: { id: u.sub },
      select: { id: true, displayName: true },
    });
    if (!user) return;

    this.server.emit('typing', {
      channelId: body.channelId,
      userId: user.id,
      displayName: user.displayName,
      isTyping: !!body.isTyping,
    });
  }
}
