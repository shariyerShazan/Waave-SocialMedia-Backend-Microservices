import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export type PrivacyType = 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
export class CreatePostDto {
  @ApiProperty()
  @IsString()
  @MaxLength(5000)
  content: string;

  @ApiPropertyOptional({
    type: [String],
  })
  @IsOptional()
  @IsArray()
  mediaIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feeling?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    enum: ['PUBLIC', 'FRIENDS', 'PRIVATE'],
  })
  @IsOptional()
  @IsIn(['PUBLIC', 'FRIENDS', 'PRIVATE'])
  privacy?: PrivacyType;
}
