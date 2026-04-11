// apps/api/src/messages/messages.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WsModule } from '../ws/ws.module';
import { BotModule } from '../bot/ai-bot.module';
import { AiAssistantModule } from '../ai-assistant/ai-assistant.module';

import { MessagesRealtime } from './messages.realtime';
import { MessagesBotOrchestrator } from './messages.bot';
import { ConversationsRealtime } from '../conversations/conversations.realtime';

@Module({
  imports: [
    PrismaModule,
    WsModule,
    forwardRef(() => BotModule),
    forwardRef(() => AiAssistantModule),
  ],
  controllers: [MessagesController],
  providers: [
    MessagesService,
    MessagesRealtime,
    MessagesBotOrchestrator,
    ConversationsRealtime,
  ],
  exports: [MessagesService],
})
export class MessagesModule {}
