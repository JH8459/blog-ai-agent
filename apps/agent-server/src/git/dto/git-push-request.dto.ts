import { ArrayNotEmpty, IsArray, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class GitPushRequestDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(/^(?!.*\.\.)(?!.*[\\/]).+$/, {
    message: 'branchPrefix cannot contain path separators'
  })
  branchPrefix?: string;

  @IsString()
  @IsNotEmpty()
  commitMessage!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  paths!: string[];
}
