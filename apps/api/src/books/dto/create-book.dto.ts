import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { COVER_STYLES } from '@storycraft/shared';

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
  @MaxLength(80)
  childNameInStory?: string;

  @IsOptional()
  @IsString()
  @IsIn(COVER_STYLES)
  coverStyle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;
}
