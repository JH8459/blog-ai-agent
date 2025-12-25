import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export enum PatchMode {
  ReplacePlaceholder = 'replacePlaceholder',
  Append = 'append'
}

export class PatchRequestDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD format'
  })
  date!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^(?!.*\.\.)(?!.*[\\/]).+$/, {
    message: 'categories cannot contain path separators'
  })
  categories!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^(?!.*\.\.)(?!.*[\\/]).+$/, {
    message: 'title cannot contain path separators'
  })
  title!: string;

  @IsString()
  @IsNotEmpty()
  bodyMarkdown!: string;

  @IsOptional()
  @IsEnum(PatchMode)
  mode?: PatchMode;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  placeholder?: string;
}
