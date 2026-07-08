import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class UnlikePostDto {
  @ApiProperty()
  @IsUUID()
  postId: string;
}
