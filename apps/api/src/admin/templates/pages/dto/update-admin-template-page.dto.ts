import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAdminTemplatePageDto {
  @IsOptional()
  @IsInt()
  pageNumber?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  textPrompt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  illustrationPrompt?: string;
}
