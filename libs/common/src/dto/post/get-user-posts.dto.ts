import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Min } from 'class-validator';

export class GetUserPostsDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

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
