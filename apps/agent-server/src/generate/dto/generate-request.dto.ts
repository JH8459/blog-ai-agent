import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class GenerateRequestDto {
  @IsString()
  @IsNotEmpty()
  emoji!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  categories!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD format'
  })
  date?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\S+$/, {
    message: 'slug cannot contain spaces'
  })
  slug?: string;
}
