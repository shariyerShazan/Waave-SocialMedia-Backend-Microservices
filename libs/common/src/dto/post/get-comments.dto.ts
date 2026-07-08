import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class GetCommentsDto {
  @ApiProperty()
  @IsUUID()
  postId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiProperty({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number;

  @ApiProperty({ default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number;
}
