// apps/api/src/channels/channels.service.ts
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChannelsService {
  constructor(private prisma: PrismaService) {}

  // Only "regular" channels; DMMs come through the direct endpoints
  list() {
    return this.prisma.channel.findMany({
      where: { isDirect: false },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, isDirect: true, createdAt: true },
    });
  }

  create(name: string, isDirect = false) {
    return this.prisma.channel.create({
      data: { name, isDirect },
      select: { id: true, name: true, isDirect: true, createdAt: true },
    });
  }

  // deterministic key voor 1-op-1 DM
  private dmKeyFor(a: string, b: string) {
    return [a, b].sort().join('_');
  }

  async getOrCreateDirectChannel(
    meId: string | undefined,
    otherUserId: string | undefined,
  ) {
    if (!meId) throw new UnauthorizedException('Missing auth user');
    if (!otherUserId) throw new NotFoundException('Missing other user id');
    if (meId === otherUserId)
      throw new ForbiddenException('Cannot DM yourself');

    // check both users
    const [me, other] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: meId },
        select: { id: true },
      }),
      this.prisma.user.findUnique({
        where: { id: otherUserId },
        select: { id: true },
      }),
    ]);
    if (!me || !other) throw new NotFoundException('User not found');

    const key = this.dmKeyFor(meId, otherUserId);

    // channel exists?
    const existing = await this.prisma.channel.findUnique({
      where: { dmKey: key },
      include: { members: { select: { id: true, displayName: true } } },
    });
    if (existing) return existing;

    // create new direct channel
    return this.prisma.channel.create({
      data: {
        name: 'Direct message',
        isDirect: true,
        dmKey: key,
        members: { connect: [{ id: meId }, { id: otherUserId }] },
      },
      include: { members: { select: { id: true, displayName: true } } },
    });
  }

  async listMyDirectChannels(meId: string | undefined) {
    if (!meId) throw new UnauthorizedException('Missing auth user');
    return this.prisma.channel.findMany({
      where: { isDirect: true, members: { some: { id: meId } } },
      include: { members: { select: { id: true, displayName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
