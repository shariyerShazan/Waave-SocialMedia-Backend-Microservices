import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsNumber,
  IsOptional,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RegisterIdentityKeyDto {
  @ApiProperty({ example: 'base64-encoded-EC-public-key' })
  @IsString()
  @IsNotEmpty()
  publicKey: string;

  @ApiProperty({ example: 'AA:BB:CC:...' })
  @IsString()
  @IsNotEmpty()
  fingerprint: string;
}

export class RegisterDeviceDto {
  @ApiProperty({ example: 'device-uuid-v4' })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiPropertyOptional({ example: 'iPhone 15 Pro' })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional({
    example: 'ios',
    enum: ['ios', 'android', 'web', 'desktop'],
  })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiPropertyOptional({ example: 'fcm-or-apns-token' })
  @IsOptional()
  @IsString()
  pushToken?: string;
}

export class SignedPreKeyDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  keyId: number;

  @ApiProperty({ example: 'base64-encoded-EC-public-key' })
  @IsString()
  @IsNotEmpty()
  publicKey: string;

  @ApiProperty({ example: 'base64-encoded-signature' })
  @IsString()
  @IsNotEmpty()
  signature: string;
}

export class OneTimePreKeyDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  keyId: number;

  @ApiProperty({ example: 'base64-encoded-EC-public-key' })
  @IsString()
  @IsNotEmpty()
  publicKey: string;
}

export class UploadPreKeysDto {
  @ApiProperty({ example: 'device-uuid-v4' })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiProperty({ type: SignedPreKeyDto })
  @ValidateNested()
  @Type(() => SignedPreKeyDto)
  signedPreKey: SignedPreKeyDto;

  @ApiProperty({ type: [OneTimePreKeyDto], minItems: 1, maxItems: 100 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => OneTimePreKeyDto)
  oneTimePreKeys: OneTimePreKeyDto[];
}

export class GetKeyBundleDto {
  @ApiProperty({ example: 'user-id-to-fetch-keys-for' })
  @IsString()
  @IsNotEmpty()
  targetUserId: string;

  @ApiPropertyOptional({ example: 'device-id' })
  @IsOptional()
  @IsString()
  targetDeviceId?: string;
}

export class RefillKeysDto {
  @ApiProperty({ example: 'device-uuid-v4' })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiProperty({ type: [OneTimePreKeyDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => OneTimePreKeyDto)
  oneTimePreKeys: OneTimePreKeyDto[];
}
