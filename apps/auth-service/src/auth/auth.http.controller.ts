import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  ChangePasswordDto,
  ForgotPassDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyRegistrationDto,
} from '@app/common';
import type { ChangePassRequest } from '@app/proto-schema/protos-types/auth';
import { AuthService } from './auth.service';

class ChangePasswordRequestDto
  extends ChangePasswordDto
  implements ChangePassRequest
{
  @ApiProperty({ example: 'user-id' })
  userId: string;
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthHttpController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register user' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('verify-registration')
  @ApiOperation({ summary: 'Verify registration OTP' })
  verifyRegistration(@Body() dto: VerifyRegistrationDto) {
    return this.authService.verifyRegistration(dto);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset OTP' })
  forgotPasswordRequest(@Body() dto: ForgotPassDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Change password' })
  changePassword(@Body() dto: ChangePasswordRequestDto) {
    return this.authService.changePassword(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout user' })
  logout(@Body('userId') userId: string) {
    return this.authService.logout(userId);
  }

  @Post('verify-token')
  @ApiOperation({ summary: 'Verify access token' })
  verifyToken(@Body('token') token: string) {
    return this.authService.verifyToken(token);
  }

  @Post('refresh-token')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: { type: 'string' },
      },
      required: ['refreshToken'],
    },
  })
  refreshToken(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user by id' })
  @ApiParam({ name: 'userId' })
  getUserById(@Param('userId') userId: string) {
    return this.authService.getUserById(userId);
  }

  @Get('user-by-email')
  @ApiOperation({ summary: 'Get user by email' })
  @ApiQuery({ name: 'email' })
  getUserByEmail(@Query('email') email: string) {
    return this.authService.getUserByEmail(email);
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all users with pagination' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getAllUsers(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.authService.getAllUsers({
      page: Number(page),
      limit: Number(limit),
    });
  }
}
