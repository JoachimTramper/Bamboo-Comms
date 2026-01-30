// apps/api/src/messages/messages.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WsModule } from '../ws/ws.module';
import { BotModule } from '../bot/ai-bot.module';

import { MessagesRealtime } from './messages.realtime';
import { MessagesBotOrchestrator } from './messages.bot';

@Module({
  imports: [PrismaModule, WsModule, forwardRef(() => BotModule)],
  controllers: [MessagesController],
  providers: [MessagesService, MessagesRealtime, MessagesBotOrchestrator],
  exports: [MessagesService],
})
export class MessagesModule {}
