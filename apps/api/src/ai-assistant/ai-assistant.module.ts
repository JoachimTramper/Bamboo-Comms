import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DigestModule } from '../digest/digest.module';
import { AiChatClient } from '../bot/ai-bot.client';
import { AiAssistantService } from './ai-assistant.service';

@Module({
  imports: [PrismaModule, forwardRef(() => DigestModule)],
  providers: [AiAssistantService, AiChatClient],
  exports: [AiAssistantService],
})
export class AiAssistantModule {}
