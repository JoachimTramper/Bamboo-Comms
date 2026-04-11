import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WsModule } from '../ws/ws.module';
import { ConversationsRealtime } from './conversations.realtime';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [PrismaModule, WsModule, MessagesModule],
  controllers: [ConversationsController],
  providers: [ConversationsService, ConversationsRealtime],
  exports: [ConversationsService],
})
export class ConversationsModule {}
