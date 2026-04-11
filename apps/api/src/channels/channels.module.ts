// apps/api/src/channels/channels.module.ts
import { Module } from '@nestjs/common';
import { ChannelsController } from './channels.controller';
import { ChannelsConversationsCompatController } from './channels-conversations-compat.controller';
import { ChannelsService } from './channels.service';
import { ConversationsModule } from '../conversations/conversations.module';
import { UsersModule } from '../users/users.module';
import { PrismaModule } from '../prisma/prisma.module';
import { WsModule } from '../ws/ws.module';

@Module({
  imports: [PrismaModule, WsModule, UsersModule, ConversationsModule],
  controllers: [ChannelsController, ChannelsConversationsCompatController],
  providers: [ChannelsService],
  exports: [ChannelsService],
})
export class ChannelsModule {}
