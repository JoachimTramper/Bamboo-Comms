import { ArrayUnique, IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateKnowledgeDocumentDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  tags?: string[];

  @IsOptional()
  @IsString()
  sourceUrl?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
