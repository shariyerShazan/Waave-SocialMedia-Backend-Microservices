import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: 'device-uuid-v4' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({ example: 'iPhone 15 Pro' })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional({ example: 'sha256-fingerprint-string' })
  @IsOptional()
  @IsString()
  deviceFingerprint?: string;

  @ApiPropertyOptional({
    example: 'ios',
    enum: ['ios', 'android', 'web', 'desktop'],
  })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiPropertyOptional({ example: '123.4' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ example: 'Mozilla/5.0...' })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({
    example: '123456',
    description: 'TOTP code if 2FA is enabled',
  })
  @IsOptional()
  @IsString()
  twoFactorCode?: string;
}
