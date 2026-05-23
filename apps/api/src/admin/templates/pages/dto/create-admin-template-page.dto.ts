import {
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateAdminTemplatePageDto {
  @IsInt()
  pageNumber!: number;

  @IsString()
  @MaxLength(2000)
  textPrompt!: string;

  @IsString()
  @MaxLength(2000)
  illustrationPrompt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  baseText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  illustrationPromptBase?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  sceneDescription?: string;

  @IsOptional()
  @IsObject()
  personalizationSlots?: Record<string, unknown>;
}
