import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum E2eeConversationType {
  DIRECT = 'DIRECT',
  GROUP = 'GROUP',
}

export enum E2eeMemberRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export enum E2eeMessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  FILE = 'FILE',
  GIF = 'GIF',
  LOCATION = 'LOCATION',
  CONTACT = 'CONTACT',
  SYSTEM = 'SYSTEM',
  SENDER_KEY_DISTRIBUTION = 'SENDER_KEY_DISTRIBUTION',
}

export enum E2eeReceiptStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
}

export class CipherPayloadDto {
  @ApiProperty({ description: 'Base64 ciphertext' })
  @IsString()
  @IsNotEmpty()
  ciphertext: string;

  @ApiProperty({ description: 'Base64 IV / nonce' })
  @IsString()
  @IsNotEmpty()
  iv: string;

  @ApiProperty({ description: 'Base64 auth tag (GCM / Poly1305)' })
  @IsString()
  @IsNotEmpty()
  authTag: string;

  @ApiPropertyOptional({ description: 'Base64 Double Ratchet header' })
  @IsOptional()
  @IsString()
  ratchetHeader?: string;

  @ApiPropertyOptional({ description: 'Base64 X3DH ephemeral key' })
  @IsOptional()
  @IsString()
  ephemeralKey?: string;

  @ApiPropertyOptional({ description: 'One-time prekey id consumed (if any)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  oneTimePreKeyId?: number;

  @ApiPropertyOptional({ description: 'Signed prekey id used' })
  @IsOptional()
  @IsInt()
  @Min(1)
  signedPreKeyId?: number;
}

export class MessageEnvelopeDto {
  @ApiProperty({ description: 'Recipient user id' })
  @IsUUID()
  recipientUserId: string;

  @ApiProperty({ description: 'Recipient device id' })
  @IsString()
  @IsNotEmpty()
  recipientDeviceId: string;

  @ApiProperty({ type: CipherPayloadDto })
  @ValidateNested()
  @Type(() => CipherPayloadDto)
  payload: CipherPayloadDto;
}

export class EncryptedAttachmentDto {
  @ApiProperty({ description: 'Media service media id' })
  @IsString()
  @IsNotEmpty()
  mediaId: string;

  @ApiProperty({ description: 'Base64 encrypted file key / metadata blob' })
  @IsString()
  @IsNotEmpty()
  encryptedKey: string;

  @ApiPropertyOptional({ example: 'image/jpeg' })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({ example: 102400 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sizeBytes?: number;

  @ApiPropertyOptional({ example: 'photo.jpg' })
  @IsOptional()
  @IsString()
  fileName?: string;
}

export class StartE2eeConversationDto {
  @ApiProperty({ example: 'user-uuid' })
  @IsUUID()
  targetUserId: string;
}

export class CreateE2eeGroupDto {
  @ApiProperty({ example: 'Family' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ type: [String], example: ['user-uuid-1', 'user-uuid-2'] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  participantIds: string[];

  @ApiPropertyOptional({ example: 'media-id-or-url' })
  @IsOptional()
  @IsString()
  avatar?: string;
}

export class AddE2eeGroupMemberDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ enum: E2eeMemberRole, default: E2eeMemberRole.MEMBER })
  @IsOptional()
  @IsEnum(E2eeMemberRole)
  role?: E2eeMemberRole;
}

export class UpdateE2eeMemberRoleDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty({ enum: E2eeMemberRole })
  @IsEnum(E2eeMemberRole)
  role: E2eeMemberRole;
}

export class SendE2eeMessageDto {
  @ApiProperty()
  @IsUUID()
  conversationId: string;

  @ApiProperty({ description: 'Sender device id' })
  @IsString()
  @IsNotEmpty()
  senderDeviceId: string;

  @ApiProperty({
    enum: E2eeMessageType,
    default: E2eeMessageType.TEXT,
  })
  @IsEnum(E2eeMessageType)
  type: E2eeMessageType;

  @ApiProperty({
    type: [MessageEnvelopeDto],
    description: 'Per-recipient-device ciphertext envelopes',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MessageEnvelopeDto)
  envelopes: MessageEnvelopeDto[];

  @ApiPropertyOptional({ type: [EncryptedAttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EncryptedAttachmentDto)
  attachments?: EncryptedAttachmentDto[];

  @ApiPropertyOptional({ description: 'Reply-to message id' })
  @IsOptional()
  @IsUUID()
  replyToMessageId?: string;

  @ApiPropertyOptional({ description: 'Forwarded-from message id' })
  @IsOptional()
  @IsUUID()
  forwardedFromMessageId?: string;

  @ApiPropertyOptional({
    description: 'Client-generated idempotency key',
  })
  @IsOptional()
  @IsString()
  clientMessageId?: string;
}

export class EditE2eeMessageDto {
  @ApiProperty({ type: [MessageEnvelopeDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MessageEnvelopeDto)
  envelopes: MessageEnvelopeDto[];
}

export class MarkE2eeReceiptDto {
  @ApiProperty()
  @IsUUID()
  messageId: string;

  @ApiProperty({ description: 'Device acknowledging the receipt' })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiProperty({ enum: E2eeReceiptStatus })
  @IsEnum(E2eeReceiptStatus)
  status: E2eeReceiptStatus;
}

export class MarkE2eeConversationReadDto {
  @ApiProperty({ description: 'Device marking read' })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiPropertyOptional({ description: 'Up to this message id inclusive' })
  @IsOptional()
  @IsUUID()
  upToMessageId?: string;
}

export class UploadSenderKeyDto {
  @ApiProperty()
  @IsUUID()
  conversationId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  senderDeviceId: string;

  @ApiProperty({ type: [MessageEnvelopeDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MessageEnvelopeDto)
  distributions: MessageEnvelopeDto[];
}

export class E2eePaginationDto {
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
  @IsUUID()
  beforeMessageId?: string;

  @ApiPropertyOptional({ description: 'Cursor: fetch messages after this id' })
  @IsOptional()
  @IsUUID()
  afterMessageId?: string;
}

export class ForwardE2eeMessageDto {
  @ApiProperty()
  @IsUUID()
  sourceMessageId: string;

  @ApiProperty()
  @IsUUID()
  targetConversationId: string;

  @ApiProperty({ description: 'Sender device id' })
  @IsString()
  @IsNotEmpty()
  senderDeviceId: string;

  @ApiProperty({ type: [MessageEnvelopeDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MessageEnvelopeDto)
  envelopes: MessageEnvelopeDto[];

  @ApiPropertyOptional({ type: [EncryptedAttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EncryptedAttachmentDto)
  attachments?: EncryptedAttachmentDto[];
}

export class ReactE2eeMessageDto {
  @ApiProperty({ example: '❤️' })
  @IsString()
  @IsNotEmpty()
  emoji: string;

  @ApiProperty({ description: 'Device reacting' })
  @IsString()
  @IsNotEmpty()
  deviceId: string;
}
