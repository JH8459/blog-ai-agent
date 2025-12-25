import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches
} from 'class-validator';

export enum ImagesMode {
  InsertSlots = 'insertSlots',
  ReplaceSlots = 'replaceSlots',
  NoPatch = 'noPatch'
}

export enum ImageExtension {
  Png = 'png',
  Jpg = 'jpg',
  Webp = 'webp'
}

export class ImagesRequestDto {
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

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @Matches(/^[a-z0-9-]+$/, {
    each: true,
    message: 'targets must use lowercase letters, numbers, or hyphens'
  })
  targets!: string[];

  @IsOptional()
  @IsEnum(ImagesMode)
  mode?: ImagesMode;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  slotPrefix?: string;

  @IsOptional()
  @IsEnum(ImageExtension)
  imageExt?: ImageExtension;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  baseUrl?: string;

  @IsOptional()
  @IsBoolean()
  updateFrontmatterThumbnail?: boolean;
}
