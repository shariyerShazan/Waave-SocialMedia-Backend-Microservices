import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetConversationDto {
  @ApiProperty({
    example: 'user_123',
  })
  userId: string;
}

export class StartConversationDto {
  @ApiProperty({
    example: 'user_123',
  })
  userId: string;

  @ApiProperty({
    example: 'user_456',
  })
  targetUserId: string;
}

export class CreateGroupDto {
  @ApiProperty({
    example: 'user_123',
  })
  userId: string;

  @ApiProperty({
    example: 'NestJS Developers',
  })
  name: string;

  @ApiProperty({
    example: ['user_456', 'user_789'],
  })
  participantIds: string[];

  @ApiPropertyOptional({
    example: 'https://example.com/group.png',
  })
  avatar?: string;
}

export class AddGroupMemberDto {
  @ApiProperty({
    example: 'user_123',
  })
  userId: string;

  @ApiProperty({
    example: 'user_456',
  })
  targetUserId: string;
}

export class MarkReadDto {
  @ApiProperty({
    example: 'user_123',
  })
  userId: string;
}

export class DeleteMessageDto {
  @ApiProperty({
    example: 'user_123',
  })
  userId: string;
}
