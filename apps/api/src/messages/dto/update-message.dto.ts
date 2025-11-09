import { IsOptional, IsString, MaxLength, IsNotEmpty } from 'class-validator';

export class UpdateMessageDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content?: string;
}
