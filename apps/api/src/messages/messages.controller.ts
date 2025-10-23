// apps/api/src/messages/messages.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../auth/decorators/user.decorator';
import { CreateMessageDto } from './dto/create-message.dto';

@Controller('channels/:id/messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly svc: MessagesService) {}

  @Get()
  list(
    @Param('id') id: string,
    @Query('take') take?: string,
    @Query('cursor') cursor?: string,
  ) {
    const n = take ? Number(take) : 50;
    return this.svc.list(id, Number.isFinite(n) ? n : 50, cursor);
  }

  @Post()
  create(
    @Param('id') id: string,
    @Body() dto: CreateMessageDto, // ⬅️ alleen { content?: string }
    @User() user: { sub: string; email: string }, // ⬅️ uit JWT
  ) {
    return this.svc.create(id, user.sub, dto.content);
  }
}
