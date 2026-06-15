import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  AuthGuard,
  ChangePasswordDto,
  ForgotPassDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  VerifyRegistrationDto,
} from '@app/common';
import * as Express from 'express';
import { ResetPasswordDto } from '@app/common/dto/auth/reset-password-dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('verify-registration')
  @ApiOperation({ summary: 'Verify Registration otp' })
  @ApiResponse({
    status: 201,
    description: "User's email verified successfully",
  })
  verifyRegistration(@Body() dto: VerifyRegistrationDto) {
    return this.authService.verifyRegistration(dto);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'send otp for forgot password' })
  @ApiResponse({
    status: 201,
    description: 'opt send successfully for forgot password',
  })
  forgotPassword(@Body() dto: ForgotPassDto) {
    return this.authService.forgotPasswordRequest(dto);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'reset you password' })
  @ApiResponse({
    status: 201,
    description: 'Password reset successfully',
  })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Refresh access token' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }
  //

  @Post('change-password')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  changePassword(@Req() req: Express.Request, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req?.user?.userId, dto);
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  logout(@Req() req: Express.Request) {
    return this.authService.logout(req?.user?.userId);
  }
}
