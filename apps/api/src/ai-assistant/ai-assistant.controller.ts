import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../auth/decorators/user.decorator';
import { AiAssistantService } from './ai-assistant.service';
import type { AuthPrincipal } from '../auth/auth.types';

type GenerateConversationDraftDto = {
  instructions?: string;
};

@Controller('conversations/:id/assistant')
@UseGuards(JwtAuthGuard)
export class AiAssistantController {
  constructor(private readonly assistant: AiAssistantService) {}

  @Post('draft')
  generateDraft(
    @Param('id') conversationId: string,
    @User() actor: AuthPrincipal,
    @Body() body: GenerateConversationDraftDto,
  ) {
    return this.assistant.generateSupportDraft(
      conversationId,
      actor,
      body?.instructions,
    );
  }
}
