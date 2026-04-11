import { IsBooleanString, IsOptional, IsString } from 'class-validator';

export class ListKnowledgeDocumentsDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsBooleanString()
  publishedOnly?: string;
}
