import { IsInt, IsString, MaxLength } from 'class-validator';

export class CreateAdminTemplatePageDto {
  @IsInt()
  pageNumber!: number;

  @IsString()
  @MaxLength(2000)
  textPrompt!: string;

  @IsString()
  @MaxLength(2000)
  illustrationPrompt!: string;
}
