import { GrpcMethod } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { Controller } from '@nestjs/common';
import { LoginDto, RegisterDto } from '@app/common';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @GrpcMethod('AuthService', 'Register')
  register(dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @GrpcMethod('AuthService', 'Login')
  login(data: LoginDto) {
    return this.authService.login(data);
  }

  @GrpcMethod('AuthService', 'Logout')
  logout(data: { accessToken: string }) {
    return this.authService.logout(data.accessToken);
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
