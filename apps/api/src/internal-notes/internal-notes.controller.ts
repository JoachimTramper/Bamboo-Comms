import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../auth/decorators/user.decorator';
import type { AuthPrincipal } from '../auth/auth.types';
import { InternalNotesService } from './internal-notes.service';
import { CreateInternalNoteDto } from './dto/create-internal-note.dto';

@Controller('conversations/:conversationId/internal-notes')
@UseGuards(JwtAuthGuard)
export class InternalNotesController {
  constructor(private readonly internalNotes: InternalNotesService) {}

  @Get()
  list(
    @Param('conversationId') conversationId: string,
    @User() user: AuthPrincipal,
  ) {
    return this.internalNotes.list(conversationId, user);
  }

  @Post()
  create(
    @Param('conversationId') conversationId: string,
    @Body() dto: CreateInternalNoteDto,
    @User() user: AuthPrincipal,
  ) {
    return this.internalNotes.create(conversationId, user, dto.content);
  }

  @Delete(':noteId')
  @HttpCode(204)
  async remove(
    @Param('conversationId') conversationId: string,
    @Param('noteId') noteId: string,
    @User() user: AuthPrincipal,
  ) {
    await this.internalNotes.remove(conversationId, noteId, user);
  }
}
