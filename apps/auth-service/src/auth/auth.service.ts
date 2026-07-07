/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { TokenService } from '../token/token.service';
import { AuthRedisService } from '../redis/redis.service';
import { KAFKA_TOPICS, KafkaService } from '@app/kafka';
import { RpcException } from '@nestjs/microservices';
import bcrypt from 'bcrypt';
import {
  // ChangePasswordDto,
  ForgotPassDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyRegistrationDto,
} from '@app/common';
import { AtuhPrismaService } from '../prisma/prisma.service';
import { ChangePassRequest } from '@app/proto-schema/protos-types/auth';
import type {
  SendRegistrationOtpEvent,
  SendResetPassOtpEvent,
  UserRegisteredEvent,
} from '@app/kafka/constants/events.type';

export interface UserLoginEvent {
  userId: string;
  email: string;
}
@Injectable()
export class AuthService {
  private logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: AtuhPrismaService,
    private tokens: TokenService,
    private redis: AuthRedisService,
    private kafka: KafkaService,
  ) {}

  async register(dto: RegisterDto) {
    const userExist = await this.prisma.readDb.user.findUnique({
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

    const authUser = !userExist
      ? await this.prisma.writeDb.user.create({
          data: {
            name: dto.name,
            email: dto.email,
            password: hashPass,
          },
        })
      : await this.prisma.writeDb.user.update({
          where: { email: dto.email },
          data: {
            name: dto.name,
            password: hashPass,
          },
        });

    const otp = await this.redis.createOtp(
      dto.email,
      KAFKA_TOPICS.USER_REGISTERED,
    );

    const registerEvent: UserRegisteredEvent = {
      userId: authUser.id,
      email: authUser.email,
      name: authUser.name,
    };

    await this.kafka.emit(KAFKA_TOPICS.USER_REGISTERED, registerEvent);

    const sendOtpEvent: SendRegistrationOtpEvent = {
      email: authUser.email,
      name: authUser.name,
      otp,
    };

    await this.kafka.emit(KAFKA_TOPICS.SEND_REGISTRATION_OTP, sendOtpEvent);

    return {
      success: true,
      message: 'Registered. Verify Your otp!',
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

    await this.prisma.writeDb.user.update({
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
    const user = await this.prisma.readDb.user.findUnique({
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

    const resetPassOtpEvent: SendResetPassOtpEvent = {
      email: dto.email,
      name: user.name,
      otp,
    };
    await this.kafka.emit(
      KAFKA_TOPICS.USER_FORGOT_PASS_REQUEST,
      resetPassOtpEvent,
    );

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

    await this.prisma.writeDb.user.update({
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

  async changePassword(dto: ChangePassRequest) {
    const user = await this.prisma.readDb.user.findUnique({
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
    await this.prisma.writeDb.user.update({
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
    const user = await this.prisma.readDb.user.findUnique({
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
    await this.prisma.writeDb.user.update({
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
      await this.prisma.writeDb.user.update({
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

    const user = await this.prisma.readDb.user.findUnique({
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
    await this.redis.saveRefreshToken(user.id, newRefreshToken, refreshTtl);

    const refreshTokenHash = await bcrypt.hash(
      newRefreshToken,
      Number(process.env.HASH_SOLT!),
    );

    await this.prisma.writeDb.user.update({
      where: {
        id: user.id,
      },
      data: {
        refreshToken: refreshTokenHash,
      },
    });

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

  async getUserById(userId: string) {
    const cacheKey = `user:id:${userId}`;

    const cachedUser = await this.redis.getCache<any>(cacheKey);
    if (cachedUser) {
      return {
        success: true,
        message: 'User fetched from cache',
        user: cachedUser,
      };
    }

    const user = await this.prisma.readDb.user.findUnique({
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

    await this.redis.setCache(cacheKey, userData, 3600);

    return {
      success: true,
      message: 'User fetched successfully',
      user: userData,
    };
  }

  async getUserByEmail(email: string) {
    const cacheKey = `user:email:${email}`;

    const cachedUser = await this.redis.getCache<any>(cacheKey);
    if (cachedUser) {
      return {
        success: true,
        message: 'User fetched from cache',
        user: cachedUser,
      };
    }

    const user = await this.prisma.readDb.user.findUnique({
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

    await this.redis.setCache(cacheKey, userData, 3600);

    return {
      success: true,
      message: 'User fetched successfully',
      user: userData,
    };
  }

  async getAllUsers(dto: { page: number; limit: number }) {
    const page = dto.page > 0 ? dto.page : 1;
    const limit = dto.limit > 0 ? dto.limit : 10;

    const skip = (page - 1) * limit;

    const cacheKey = `users:all:page_${page}:limit_${limit}`;

    const cachedData = await this.redis.getCache<{
      users: any[];
      total: number;
    }>(cacheKey);
    if (cachedData) {
      return {
        success: true,
        message: 'All users fetched from cache',
        users: cachedData.users,
        total: cachedData.total,
        page,
        limit,
      };
    }

    const [users, total] = await Promise.all([
      this.prisma.readDb.user.findMany({
        skip: skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.readDb.user.count(),
    ]);

    const usersData = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    }));

    const responseData = {
      users: usersData,
      total: total,
    };
    await this.redis.setCache(cacheKey, responseData, 600);
    return {
      success: true,
      message: 'All users fetched successfully',
      users: usersData,
      total,
      page,
      limit,
    };
  }
}
