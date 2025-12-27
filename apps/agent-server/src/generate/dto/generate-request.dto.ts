import { IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class GenerateRequestDto {
  @IsString()
  @IsNotEmpty()
  emoji!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(30, {
    message: 'brief must be at least 30 characters'
  })
  brief!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^(?!.*\.\.)(?!.*[\\/]).+$/, {
    message: 'categories cannot contain path separators'
  })
  categories!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD format'
  })
  date?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(?!.*\.\.)(?!.*[\\/]).+$/, {
    message: 'slug cannot contain path separators'
  })
  slug?: string;
}
