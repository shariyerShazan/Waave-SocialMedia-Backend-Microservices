import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

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

export class ChatPaginationDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 50, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @ApiPropertyOptional({ description: 'Cursor: fetch messages before this id' })
  @IsOptional()
  @IsString()
  beforeMessageId?: string;

  @ApiPropertyOptional({ description: 'Cursor: fetch messages after this id' })
  @IsOptional()
  @IsString()
  afterMessageId?: string;
}

export class StartConversationDto {
  @ApiProperty({
    example: 'user_456',
  })
  @IsString()
  @IsNotEmpty()
  targetUserId: string;
}

export class CreateGroupDto {
  @ApiProperty({
    example: 'NestJS Developers',
  })
  @IsString()
  @IsNotEmpty()
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
  @IsNotEmpty()
  userId: string;

  @ApiPropertyOptional({ example: 'MEMBER' })
  @IsOptional()
  @IsString()
  role?: string;
}

export class UpdateMemberRoleDto {
  @ApiProperty({ example: 'user_456' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: 'ADMIN' })
  @IsString()
  @IsNotEmpty()
  role: string;
}

export class MuteConversationDto {
  @ApiProperty()
  @IsBoolean()
  muted: boolean;

  @ApiPropertyOptional({
    description: 'Mute until ISO timestamp; omit for indefinite',
  })
  @IsOptional()
  @IsString()
  mutedUntil?: string;
}

export class ArchiveConversationDto {
  @ApiProperty()
  @IsBoolean()
  archived: boolean;
}

export class PinConversationDto {
  @ApiProperty()
  @IsBoolean()
  pinned: boolean;
}

export class SendMessageDto {
  @ApiProperty({
    example: '6880abc123456',
  })
  @IsString()
  @IsNotEmpty()
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

  @ApiPropertyOptional({ description: 'Forwarded-from message id' })
  @IsOptional()
  @IsString()
  forwardedFromMessageId?: string;

  @ApiPropertyOptional({ description: 'Client-generated idempotency key' })
  @IsOptional()
  @IsString()
  clientMessageId?: string;
}

export class EditMessageDto {
  @ApiProperty({ example: 'Updated message text' })
  @IsString()
  @IsNotEmpty()
  text: string;
}

export class ForwardMessageDto {
  @ApiProperty({ example: 'source-msg-id' })
  @IsString()
  @IsNotEmpty()
  sourceMessageId: string;

  @ApiProperty({ example: 'target-conv-id' })
  @IsString()
  @IsNotEmpty()
  targetConversationId: string;
}

export class MarkReceiptDto {
  @ApiProperty({ example: 'message-id' })
  @IsString()
  @IsNotEmpty()
  messageId: string;

  @ApiProperty({ example: 'DELIVERED' })
  @IsString()
  @IsNotEmpty()
  status: string;
}

export class MarkConversationReadDto {
  @ApiPropertyOptional({ description: 'Up to this message id inclusive' })
  @IsOptional()
  @IsString()
  upToMessageId?: string;
}

export class ReactMessageDto {
  @ApiProperty({
    example: '❤️',
  })
  @IsString()
  @IsNotEmpty()
  emoji: string;
}

export class PinMessageDto {
  @ApiProperty()
  @IsBoolean()
  pinned: boolean;
}
