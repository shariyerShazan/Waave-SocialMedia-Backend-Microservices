import { GrpcMethod } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { Controller } from '@nestjs/common';
import {
  // ChangePasswordDto,
  ForgotPassDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyRegistrationDto,
} from '@app/common';
import type {
  LogoutRequest,
  ChangePassRequest,
} from '@app/proto-schema/protos-types/auth';

@Controller('auth')
export class AuthGrpcController {
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
  changePassword(dto: ChangePassRequest) {
    return this.authService.changePassword(dto);
  }

  @GrpcMethod('AuthService', 'Login')
  login(data: LoginDto) {
    return this.authService.login(data);
  }

  @GrpcMethod('AuthService', 'Logout')
  logout(data: LogoutRequest) {
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

  @GrpcMethod('AuthService', 'GetUserById')
  getUserById(data: { userId: string }) {
    return this.authService.getUserById(data.userId);
  }

  @GrpcMethod('AuthService', 'GetUserByEmail')
  getUserByEmail(data: { email: string }) {
    return this.authService.getUserByEmail(data.email);
  }

  @GrpcMethod('AuthService', 'GetAllUsers')
  getAllUsers(data: { page: number; limit: number }) {
    return this.authService.getAllUsers(data);
  }
}
