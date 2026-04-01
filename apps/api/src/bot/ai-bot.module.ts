// apps/api/src/bot/ai-bot.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { DigestModule } from '../digest/digest.module';
import { AiBotService } from './ai-bot.service';
import { AiAssistantModule } from '../ai-assistant/ai-assistant.module';

@Module({
  imports: [forwardRef(() => DigestModule), AiAssistantModule],
  providers: [AiBotService],
  exports: [AiBotService],
})
export class BotModule {}
