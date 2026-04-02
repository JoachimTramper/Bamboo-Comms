import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DigestModule } from '../digest/digest.module';
import { AiChatClient } from '../bot/ai-bot.client';
import { AiAssistantService } from './ai-assistant.service';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { AiAssistantController } from './ai-assistant.controller';

@Module({
  imports: [PrismaModule, forwardRef(() => DigestModule), KnowledgeBaseModule],
  controllers: [AiAssistantController],
  providers: [AiAssistantService, AiChatClient],
  exports: [AiAssistantService],
})
export class AiAssistantModule {}
