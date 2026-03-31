import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConversationsService } from '../conversations/conversations.service';
import { AssignConversationDto } from '../conversations/dto/assign-conversation.dto';
import { CreateConversationDto } from '../conversations/dto/create-conversation.dto';
import { ListConversationsDto } from '../conversations/dto/list-conversations.dto';
import { TransitionConversationDto } from '../conversations/dto/transition-conversation.dto';
import { UpdateConversationStatusDto } from '../conversations/dto/update-conversation-status.dto';
import { UpdateConversationDto } from '../conversations/dto/update-conversation.dto';

@Controller('channels/conversations')
@UseGuards(JwtAuthGuard)
export class ChannelsConversationsCompatController {
  constructor(private readonly conversations: ConversationsService) {}

  @Get()
  list(@Query() query: ListConversationsDto) {
    return this.conversations.listConversations(query);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.conversations.getConversationById(id);
  }

  @Post()
  create(@Body() dto: CreateConversationDto) {
    return this.conversations.createConversation(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateConversationDto) {
    return this.conversations.updateConversation(id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateConversationStatusDto,
  ) {
    return this.conversations.updateConversationStatus(id, dto.status);
  }

  @Patch(':id/assign')
  assign(@Param('id') id: string, @Body() dto: AssignConversationDto) {
    return this.conversations.assignConversation(id, dto.assigneeId);
  }

  @Patch(':id/lifecycle')
  transition(@Param('id') id: string, @Body() dto: TransitionConversationDto) {
    return this.conversations.transitionConversation(id, dto.action);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.conversations.deleteConversation(id);
  }
}
