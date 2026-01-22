import { IsString, MaxLength } from 'class-validator';

export class UpdateDisplayNameDto {
  @IsString()
  @MaxLength(32)
  displayName!: string;
}
