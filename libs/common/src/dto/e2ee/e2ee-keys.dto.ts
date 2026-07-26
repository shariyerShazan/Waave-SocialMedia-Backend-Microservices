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
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum DevicePlatform {
  PHONE = 'PHONE',
  TABLET = 'TABLET',
  LAPTOP = 'LAPTOP',
  DESKTOP = 'DESKTOP',
  WEB = 'WEB',
  OTHER = 'OTHER',
}

export class RegisterDeviceDto {
  @ApiProperty({ example: 'iphone-15-pro-uuid' })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiProperty({ example: 'iPhone 15 Pro' })
  @IsString()
  @IsNotEmpty()
  deviceName: string;

  @ApiProperty({ enum: DevicePlatform, example: DevicePlatform.PHONE })
  @IsEnum(DevicePlatform)
  platform: DevicePlatform;

  @ApiPropertyOptional({ example: 'iOS 18.0' })
  @IsOptional()
  @IsString()
  osVersion?: string;

  @ApiPropertyOptional({ example: '1.0.0' })
  @IsOptional()
  @IsString()
  appVersion?: string;
}

export class IdentityKeyDto {
  @ApiProperty({ description: 'Base64-encoded public identity key' })
  @IsString()
  @IsNotEmpty()
  publicKey: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  registrationId: number;
}

export class SignedPreKeyDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  keyId: number;

  @ApiProperty({ description: 'Base64-encoded signed prekey public key' })
  @IsString()
  @IsNotEmpty()
  publicKey: string;

  @ApiProperty({ description: 'Base64-encoded signature over the public key' })
  @IsString()
  @IsNotEmpty()
  signature: string;
}

export class OneTimePreKeyDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  keyId: number;

  @ApiProperty({ description: 'Base64-encoded one-time prekey public key' })
  @IsString()
  @IsNotEmpty()
  publicKey: string;
}

export class UploadKeysDto {
  @ApiProperty({ example: 'iphone-15-pro-uuid' })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiProperty({ type: IdentityKeyDto })
  @ValidateNested()
  @Type(() => IdentityKeyDto)
  identityKey: IdentityKeyDto;

  @ApiProperty({ type: SignedPreKeyDto })
  @ValidateNested()
  @Type(() => SignedPreKeyDto)
  signedPreKey: SignedPreKeyDto;

  @ApiProperty({ type: [OneTimePreKeyDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OneTimePreKeyDto)
  oneTimePreKeys: OneTimePreKeyDto[];
}

export class RotateSignedPreKeyDto {
  @ApiProperty({ example: 'iphone-15-pro-uuid' })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiProperty({ type: SignedPreKeyDto })
  @ValidateNested()
  @Type(() => SignedPreKeyDto)
  signedPreKey: SignedPreKeyDto;
}

export class RefillOneTimePreKeysDto {
  @ApiProperty({ example: 'iphone-15-pro-uuid' })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiProperty({ type: [OneTimePreKeyDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OneTimePreKeyDto)
  oneTimePreKeys: OneTimePreKeyDto[];
}

export class GetKeyBundleDto {
  @ApiProperty({ description: 'Target user whose key bundle is requested' })
  @IsUUID()
  targetUserId: string;

  @ApiPropertyOptional({
    description: 'Specific device; omit to get all active devices',
  })
  @IsOptional()
  @IsString()
  deviceId?: string;
}
