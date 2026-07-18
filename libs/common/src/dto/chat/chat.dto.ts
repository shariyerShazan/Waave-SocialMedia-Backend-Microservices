import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class PaginationDto {
  @ApiPropertyOptional({
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  limit?: number = 20;
}

export class StartConversationDto {
  @ApiProperty({
    example: 'user_456',
  })
  @IsString()
  targetUserId: string;
}

export class CreateGroupDto {
  @ApiProperty({
    example: 'NestJS Developers',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: ['user_456', 'user_789'],
    type: [String],
  })
  @IsArray()
  participantIds: string[];

  @ApiPropertyOptional({
    example: 'https://example.com/group.png',
  })
  @IsOptional()
  @IsString()
  avatar?: string;
}

export class AddGroupMemberDto {
  @ApiProperty({
    example: 'user_456',
  })
  @IsString()
  userId: string;
}

export class SendMessageDto {
  @ApiProperty({
    example: '6880abc123456',
  })
  @IsString()
  conversationId: string;

  @ApiProperty({
    example: 'Hello!',
  })
  @IsString()
  text: string;

  @ApiPropertyOptional({
    example: ['media-id-1', 'media-id-2'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  mediaIds?: string[];

  @ApiPropertyOptional({
    example: 'text',
    default: 'text',
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    example: 'message-id',
  })
  @IsOptional()
  @IsString()
  replyTo?: string;
}

export class ReactMessageDto {
  @ApiProperty({
    example: '❤️',
  })
  @IsString()
  emoji: string;
}
