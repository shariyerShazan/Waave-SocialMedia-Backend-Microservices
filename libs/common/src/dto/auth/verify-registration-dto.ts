import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  // Matches,
} from 'class-validator';

export class VerifyRegistrationDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '123456', minLength: 6 })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  otp: string;
}
