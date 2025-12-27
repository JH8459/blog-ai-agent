import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength
} from 'class-validator';

export class GenerateRequestDto {
  @IsString()
  @IsNotEmpty()
  emoji!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(30, {
    message: 'brief must be at least 30 characters'
  })
  @Matches(/\S/, {
    message: 'brief must not be blank'
  })
  brief!: string;

  @Transform(({ value }) =>
    Array.isArray(value)
      ? value.map((item) => (typeof item === 'string' ? item.trim() : item))
      : value
  )
  @IsArray()
  @ArrayMinSize(3, { message: 'outline must have at least 3 items' })
  @ArrayMaxSize(20, { message: 'outline must have at most 20 items' })
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @Matches(/\S/, { each: true, message: 'outline items must not be blank' })
  @MaxLength(200, { each: true, message: 'outline items must be 200 chars or less' })
  outline!: string[];

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
