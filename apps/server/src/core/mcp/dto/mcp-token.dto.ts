import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class ListMcpTokensDto {
  @IsOptional()
  @IsBoolean()
  adminView?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class CreateMcpTokenDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  allowedSpaceIds?: string[];
}

export class RevokeMcpTokenDto {
  @IsUUID()
  tokenId: string;
}
