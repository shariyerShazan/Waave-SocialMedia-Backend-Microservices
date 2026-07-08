import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AddCommentDto {
  @ApiProperty()
  @IsUUID()
  postId: string;

  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  text: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
