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
import { KnowledgeBaseService } from './knowledge-base.service';
import { CreateKnowledgeDocumentDto } from './dto/create-knowledge-document.dto';
import { UpdateKnowledgeDocumentDto } from './dto/update-knowledge-document.dto';
import { ListKnowledgeDocumentsDto } from './dto/list-knowledge-documents.dto';

@Controller('knowledge-base')
@UseGuards(JwtAuthGuard)
export class KnowledgeBaseController {
  constructor(private readonly knowledgeBase: KnowledgeBaseService) {}

  @Get()
  list(@Query() query: ListKnowledgeDocumentsDto) {
    return this.knowledgeBase.list({
      query: query.query,
      tag: query.tag,
      publishedOnly: query.publishedOnly === 'true',
    });
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.knowledgeBase.getById(id);
  }

  @Post()
  create(@Body() dto: CreateKnowledgeDocumentDto) {
    return this.knowledgeBase.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateKnowledgeDocumentDto) {
    return this.knowledgeBase.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.knowledgeBase.remove(id);
  }
}
