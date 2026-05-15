import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateAdminTemplateDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @IsOptional()
  @IsInt()
  ageMin?: number;

  @IsOptional()
  @IsInt()
  ageMax?: number;

  @IsOptional()
  @IsInt()
  pageCount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  storyPrompt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  illustrationStylePrompt?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
