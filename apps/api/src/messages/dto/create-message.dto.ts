// apps/api/src/messages/dto/create-message.dto.ts
import {
  IsOptional,
  IsString,
  MaxLength,
  IsArray,
  ArrayUnique,
} from 'class-validator';

export class CreateMessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  @IsOptional()
  @IsString()
  replyToMessageId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  mentionUserIds?: string[];
}
