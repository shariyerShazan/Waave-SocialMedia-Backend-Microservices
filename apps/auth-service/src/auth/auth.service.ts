import { AuthPrismaService } from '@app/prisma';
import { Injectable, Logger } from '@nestjs/common';
import { TokenService } from '../token/token.service';
import { RedisService } from '../redis/redis.service';
import { KAFKA_TOPICS, KafkaService } from '@app/kafka';
import { RpcException } from '@nestjs/microservices';
import bcrypt from 'bcrypt';
import {
  // ChangePasswordDto,
  ForgotPassDto,
  LoginDto,
  RegisterDto,
  VerifyRegistrationDto,
} from '@app/common';
import { ResetPasswordDto } from '@app/common/dto/auth/reset-password-dto';
export interface UserRegisteredEvent {
  userId: string;
  email: string;
  name: string;
}

export interface UserLoginEvent {
  userId: string;
  email: string;
}
@Injectable()
export class AuthService {
  private logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: AuthPrismaService,
    private tokens: TokenService,
    private redis: RedisService,
    private kafka: KafkaService,
  ) {}

  async register(dto: RegisterDto) {
    const userExist = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (userExist && userExist.isEmailVerified) {
      throw new RpcException({
        code: 6,
        message: 'Email already Exist!',
      });
    }
    const hashPass = await bcrypt.hash(
      dto.password,
      Number(process.env.HASH_SOLT!),
    );

    if (!userExist) {
      await this.prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          password: hashPass,
        },
      });
    } else {
      await this.prisma.user.update({
        where: { email: dto.email },
        data: {
          name: dto.name,
          password: hashPass,
        },
      });
    }

    const otp = await this.redis.createOtp(
      dto.email,
      KAFKA_TOPICS.USER_REGISTERED,
    );

    await this.kafka.emit(KAFKA_TOPICS.USER_REGISTERED, {
      email: dto.email,
      name: dto.name,
      otp,
    });

    return {
      success: true,
      message: 'Registraed. Verify Your otp!',
    };
  }

  async verifyRegistration(dto: VerifyRegistrationDto) {
    const email = dto.email,
      otp = dto.otp;
    const valid = await this.redis.verifyOtp(
      email,
      KAFKA_TOPICS.USER_REGISTERED,
      otp,
    );

    if (!valid) {
      throw new RpcException({
        code: 16,
        message: 'Invalid OTP',
      });
    }

    await this.prisma.user.update({
      where: { email },
      data: {
        isEmailVerified: true,
      },
    });

    await this.redis.deleteOtp(email, KAFKA_TOPICS.USER_REGISTERED);

    return {
      success: true,
      message: 'Email verified successfully',
    };
  }

  async forgotPassword(dto: ForgotPassDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new RpcException({
        code: 16,
        message: 'User not available with this email!',
      });
    }
    if (!user.isEmailVerified) {
      throw new RpcException({
        code: 16,
        message: 'User not Email Verified',
      });
    }
    const otp = await this.redis.createOtp(
      dto.email,
      KAFKA_TOPICS.USER_FORGOT_PASS_REQUEST,
    );

    await this.kafka.emit(KAFKA_TOPICS.USER_FORGOT_PASS_REQUEST, {
      email: dto.email,
      name: user.name,
      otp,
    });

    return {
      success: true,
      message: 'Forgot Password Otp send to you mail!',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const email = dto.email,
      otp = dto.otp;

    const valid = await this.redis.verifyOtp(
      email,
      KAFKA_TOPICS.USER_FORGOT_PASS_REQUEST,
      otp,
    );

    if (!valid) {
      throw new RpcException({
        code: 16,
        message: 'Invalid OTP',
      });
    }

    const hashPass = await bcrypt.hash(
      dto.newPassword,
      Number(process.env.HASH_SOLT!),
    );

    await this.prisma.user.update({
      where: { email },
      data: {
        password: hashPass,
        refreshToken: null,
      },
    });

    await this.redis.deleteOtp(email, KAFKA_TOPICS.USER_FORGOT_PASS_REQUEST);

    return {
      success: true,
      message: 'Resent Password Successfully! Please login',
    };
  }

  async changePassword(dto: {
    userId: string;
    oldPassword: string;
    newPassword: string;
  }) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });
    if (!user) {
      throw new RpcException({
        code: 16,
        message: 'User not available with this email!',
      });
    }
    if (!user.isEmailVerified) {
      throw new RpcException({
        code: 16,
        message: 'User not Email Verified',
      });
    }
    if (user.refreshToken === null) {
      throw new RpcException({
        code: 16,
        message: 'User not Authenticated!',
      });
    }
    const isValidPass = await bcrypt.compare(dto.oldPassword, user.password);
    if (!isValidPass) {
      throw new RpcException({
        code: 16,
        message: 'Old password is incorrect!',
      });
    }

    const hashPass = await bcrypt.hash(
      dto.newPassword,
      Number(process.env.HASH_SOLT!),
    );
    await this.prisma.user.update({
      where: { id: dto.userId },
      data: {
        password: hashPass,
      },
    });

    return {
      success: true,
      message: 'Password change Successfully!',
    };
  }

  async login(dto: LoginDto) {
    const attempts = await this.redis.getLoginAttempts(dto.email);
    if (attempts > Number(process.env.MAX_LOGIN_ATTEMPTS!)) {
      throw new RpcException({
        code: 8,
        message: 'Too many login attempts. Try again in 15 minutes.',
      });
    }
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      await this.redis.incrementLoginAttempts(dto.email);
      throw new RpcException({
        code: 16,
        message: 'User not available with this email!',
      });
    }
    if (!user.isEmailVerified) {
      throw new RpcException({
        code: 16,
        message: 'Please verify your email first',
      });
    }
    const isValidPass = await bcrypt.compare(dto.password, user.password);
    if (!isValidPass) {
      await this.redis.incrementLoginAttempts(dto.email);
      throw new RpcException({
        code: 16,
        message: 'Password incorrect!',
      });
    }

    await this.redis.resetLoginAttempts(dto.email);
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = this.tokens.generateAccessToken(payload);
    const refreshToken = this.tokens.generateRefreshToken(payload);

    const refreshTtl = this.tokens.getTokenTTL(refreshToken);
    await this.redis.saveRefreshToken(user.id, refreshToken, refreshTtl);

    const refreshTokenHash = await bcrypt.hash(
      refreshToken,
      Number(process.env.HASH_SOLT!),
    );
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: refreshTokenHash,
      },
    });

    await this.kafka.emit<UserLoginEvent>(KAFKA_TOPICS.USER_LOGIN, {
      userId: user.id,
      email: user.email,
    });

    this.logger.log(`User logged in: ${user.email}`);

    return {
      success: true,
      accessToken,
      refreshToken,
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      },
    };
  }

  async logout(userId: string) {
    try {
      await this.redis.deleteRefreshToken(userId);
      await this.prisma.user.update({
        where: { id: userId },
        data: { refreshToken: null },
      });
    } catch (error) {
      console.error('Logout failed for user:', userId, error);
    }
    return { success: true, message: 'Logged out successfully' };
  }

  async verifyToken(token: string) {
    const payload = await this.tokens.verifyAccessToken(token);
    if (!payload) {
      return {
        valid: false,
        userId: '',
        email: '',
        role: '',
        message: 'Invalid or expired token',
      };
    }
    return {
      valid: true,
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      message: 'Token valid',
    };
  }

  async refreshToken(refreshToken: string) {
    const payload = this.tokens.verifyRefreshToken(refreshToken);

    if (!payload) {
      throw new RpcException({
        code: 16,
        message: 'Invalid refresh token',
      });
    }
    const stored = await this.redis.getRefreshToken(payload.userId);
    if (!stored || stored !== refreshToken) {
      throw new RpcException({
        code: 16,
        message: 'Refresh token mismatch',
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
    });
    if (!user) {
      throw new RpcException({
        code: 5,
        message: 'User not found',
      });
    }
    const newPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const newAccessToken = this.tokens.generateAccessToken(newPayload);
    const newRefreshToken = this.tokens.generateRefreshToken(newPayload);

    const refreshTtl = this.tokens.getTokenTTL(refreshToken);
    await this.redis.saveRefreshToken(user.id, refreshToken, refreshTtl);

    return {
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      message: 'Token refreshed',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      },
    };
  }

  // আপনার বিদ্যমান AuthService এর ভেতর নিচের মেffডগুলো যোগ করুন:

  async getUserById(userId: string) {
    const cacheKey = `user:id:${userId}`;

    // ১. চেক করুন ক্যাশে ডাটা আছে কি না
    const cachedUser = await this.redis.getCache<any>(cacheKey);
    if (cachedUser) {
      return {
        success: true,
        message: 'User fetched from cache',
        user: cachedUser,
      };
    }

    // ২. ক্যাশে না থাকলে ডাটাবেজ থেকে আনুন
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new RpcException({ code: 5, message: 'User not found' });
    }

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    };

    // ৩. ক্যাশে ১ ঘণ্টার জন্য সেভ করে রাখুন
    await this.redis.setCache(cacheKey, userData, 3600);

    return {
      success: true,
      message: 'User fetched successfully',
      user: userData,
    };
  }

  async getUserByEmail(email: string) {
    const cacheKey = `user:email:${email}`;

    // ১. ক্যাশ চেক
    const cachedUser = await this.redis.getCache<any>(cacheKey);
    if (cachedUser) {
      return {
        success: true,
        message: 'User fetched from cache',
        user: cachedUser,
      };
    }

    // ২. ডাটাবেজ কোয়েরি
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new RpcException({ code: 5, message: 'User not found' });
    }

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    };

    // ৩. ক্যাশ রাইট
    await this.redis.setCache(cacheKey, userData, 3600);

    return {
      success: true,
      message: 'User fetched successfully',
      user: userData,
    };
  }

  async getAllUsers() {
    const cacheKey = 'users:all';

    const cachedUsers = await this.redis.getCache<any[]>(cacheKey);
    if (cachedUsers) {
      return {
        success: true,
        message: 'All users fetched from cache',
        users: cachedUsers,
      };
    }
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const usersData = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    }));

    await this.redis.setCache(cacheKey, usersData, 600);

    return {
      success: true,
      message: 'All users fetched successfully',
      users: usersData,
    };
  }
}
