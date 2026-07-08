import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class BookmarkPostDto {
  @ApiProperty()
  @IsUUID()
  postId: string;
}
