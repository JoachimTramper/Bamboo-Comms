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
import { User } from '../auth/decorators/user.decorator';
import type { AuthPrincipal } from '../auth/auth.types';
import { ConversationsService } from './conversations.service';
import { CreateCustomerConversationDto } from './dto/create-customer-conversation.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { UpdateConversationStatusDto } from './dto/update-conversation-status.dto';
import { AssignConversationDto } from './dto/assign-conversation.dto';
import { ListConversationsDto } from './dto/list-conversations.dto';
import { TransitionConversationDto } from './dto/transition-conversation.dto';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Get()
  list(@Query() query: ListConversationsDto, @User() user: AuthPrincipal) {
    return this.conversations.listConversations(query, user);
  }

  @Get(':id')
  getById(@Param('id') id: string, @User() user: AuthPrincipal) {
    return this.conversations.getConversationById(id, user);
  }

  @Post()
  create(@Body() dto: CreateConversationDto) {
    return this.conversations.createConversation(dto);
  }

  @Post('customer')
  createForCustomer(
    @Body() dto: CreateCustomerConversationDto,
    @User() user: AuthPrincipal,
  ) {
    return this.conversations.createCustomerConversation(user, dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateConversationDto,
    @User() user: AuthPrincipal,
  ) {
    return this.conversations.updateConversation(id, dto, user);
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
