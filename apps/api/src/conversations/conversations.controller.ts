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
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { UpdateConversationStatusDto } from './dto/update-conversation-status.dto';
import { AssignConversationDto } from './dto/assign-conversation.dto';
import { ListConversationsDto } from './dto/list-conversations.dto';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Get()
  list(@Query() query: ListConversationsDto) {
    return this.conversations.list(query);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.conversations.getById(id);
  }

  @Post()
  create(@Body() dto: CreateConversationDto) {
    return this.conversations.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateConversationDto,
  ) {
    return this.conversations.update(id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateConversationStatusDto,
  ) {
    return this.conversations.updateStatus(id, dto.status);
  }

  @Patch(':id/assign')
  assign(
    @Param('id') id: string,
    @Body() dto: AssignConversationDto,
  ) {
    return this.conversations.assign(id, dto.assigneeId);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.conversations.remove(id);
  }
}
