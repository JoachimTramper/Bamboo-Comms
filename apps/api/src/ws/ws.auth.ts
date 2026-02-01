// apps/api/src/ws/ws.auth.ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Socket } from 'socket.io';

export type JwtPayload = { sub: string; email: string };

@Injectable()
export class WsAuthService {
  constructor(private jwt: JwtService) {}

  getPayload(client: Socket): JwtPayload | null {
    const raw =
      (client.handshake.auth as any)?.token ||
      (client.handshake.headers['authorization'] as string | undefined);

    const token = raw?.startsWith('Bearer ') ? raw.slice(7) : raw || '';
    if (!token) return null;

    try {
      return this.jwt.verify(token, {
        secret: process.env.JWT_SECRET!,
      }) as JwtPayload;
    } catch {
      return null;
    }
  }
}
