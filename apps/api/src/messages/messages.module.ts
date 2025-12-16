// apps/api/src/messages/messages.module.ts
import { Module } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WsModule } from '../ws/ws.module';
import { BotModule } from 'src/bot/ai-bot.module';

@Module({
  imports: [PrismaModule, WsModule, BotModule],
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}
