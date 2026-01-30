// apps/api/src/bot/ai-bot.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DigestModule } from '../digest/digest.module';
import { AiBotService } from './ai-bot.service';
import { AiChatClient } from './ai-bot.client';

@Module({
  imports: [PrismaModule, forwardRef(() => DigestModule)],
  providers: [AiBotService, AiChatClient],
  exports: [AiBotService],
})
export class BotModule {}
