import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WsModule } from '../ws/ws.module';
import { ConversationsRealtime } from './conversations.realtime';

@Module({
  imports: [PrismaModule, WsModule],
  controllers: [ConversationsController],
  providers: [ConversationsService, ConversationsRealtime],
  exports: [ConversationsService],
})
export class ConversationsModule {}
