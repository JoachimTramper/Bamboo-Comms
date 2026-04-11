// apps/api/src/messages/dto/create-message.dto.ts
import {
  IsOptional,
  IsString,
  MaxLength,
  IsArray,
  ArrayUnique,
  ValidateNested,
  IsInt,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MessageContextType } from '@prisma/client';

class AttachmentDto {
  @IsString()
  url: string;

  @IsString()
  fileName: string;

  @IsString()
  mimeType: string;

  @IsInt()
  size: number;
}

export class CreateMessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsEnum(MessageContextType)
  messageType?: MessageContextType;

  @IsOptional()
  @IsString()
  replyToMessageId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  mentionUserIds?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @IsOptional()
  @IsString()
  lastReadOverride?: string;
}
