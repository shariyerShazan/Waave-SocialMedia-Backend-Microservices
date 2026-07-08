import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class LikePostDto {
  @ApiProperty()
  @IsUUID()
  postId: string;
}
