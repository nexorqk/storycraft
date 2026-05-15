import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateBookDto {
  @IsUUID()
  childId!: string;

  @IsUUID()
  templateId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;
}
