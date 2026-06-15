import { GrpcMethod } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { Controller } from '@nestjs/common';
import {
  // ChangePasswordDto,
  ForgotPassDto,
  LoginDto,
  RegisterDto,
  VerifyRegistrationDto,
} from '@app/common';
import { ResetPasswordDto } from '@app/common/dto/auth/reset-password-dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @GrpcMethod('AuthService', 'Register')
  register(dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @GrpcMethod('AuthService', 'VerifyRegistration')
  verifyRegistration(dto: VerifyRegistrationDto) {
    return this.authService.verifyRegistration(dto);
  }

  @GrpcMethod('AuthService', 'ForgotPasswordRequest')
  forgotPasswordRequest(dto: ForgotPassDto) {
    return this.authService.forgotPassword(dto);
  }

  @GrpcMethod('AuthService', 'ResetPassword')
  resetPassword(dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @GrpcMethod('AuthService', 'ChangePassword')
  changePassword(dto: {
    userId: string;
    oldPassword: string;
    newPassword: string;
  }) {
    return this.authService.changePassword(dto);
  }

  @GrpcMethod('AuthService', 'Login')
  login(data: LoginDto) {
    return this.authService.login(data);
  }

  @GrpcMethod('AuthService', 'Logout')
  logout(data: { userId: string }) {
    return this.authService.logout(data.userId);
  }

  @GrpcMethod('AuthService', 'VerifyToken')
  verifyToken(data: { token: string }) {
    return this.authService.verifyToken(data.token);
  }

  @GrpcMethod('AuthService', 'RefreshToken')
  refreshToken(data: { refreshToken: string }) {
    return this.authService.refreshToken(data.refreshToken);
  }
}
