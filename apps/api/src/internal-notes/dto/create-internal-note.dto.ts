import { IsString, MaxLength } from 'class-validator';

export class CreateInternalNoteDto {
  @IsString()
  @MaxLength(4000)
  content!: string;
}
