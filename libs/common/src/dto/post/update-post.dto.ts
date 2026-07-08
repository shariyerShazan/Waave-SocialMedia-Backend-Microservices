import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePostDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  @ApiPropertyOptional({
    enum: ['PUBLIC', 'FRIENDS', 'PRIVATE'],
  })
  @IsOptional()
  @IsIn(['PUBLIC', 'FRIENDS', 'PRIVATE'])
  privacy?: string;
}
