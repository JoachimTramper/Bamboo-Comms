import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChannelsService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.channel.findMany({ orderBy: { createdAt: 'desc' } });
  }

  create(name: string, isDirect = false) {
    return this.prisma.channel.create({ data: { name, isDirect } });
  }
}
