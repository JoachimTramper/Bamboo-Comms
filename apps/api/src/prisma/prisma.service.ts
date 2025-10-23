// src/prisma/prisma.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient {
  // optional: you can add your own methods here
  async onModuleInit() {
    await this.$connect();
  }
}
