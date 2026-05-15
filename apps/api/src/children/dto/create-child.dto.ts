import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateChildDto {
  @IsString()
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  interests?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(80)
  readingLevel?: string;
}
