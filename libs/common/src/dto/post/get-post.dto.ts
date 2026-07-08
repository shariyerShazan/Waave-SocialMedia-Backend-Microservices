import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class GetPostDto {
  @ApiProperty()
  @IsUUID()
  postId: string;
}
