/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { AuthPrismaService } from '@app/prisma';
import { Injectable, Logger } from '@nestjs/common';
import { TokenService } from '../token/token.service';
import { RedisService } from '../redis/redis.service';
import { KAFKA_TOPICS, KafkaService } from '@app/kafka';
import { RpcException } from '@nestjs/microservices';
import bcrypt from 'bcrypt';
import { LoginDto, RegisterDto } from '@app/common';
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
    if (userExist) {
      throw new RpcException({
        code: 6,
        message: 'Email already Exist!',
      });
    }
    const hashPass = await bcrypt.hash(
      dto.password,
      Number(process.env.HASH_SOLT!),
    );
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        password: hashPass,
      },
    });

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

    await this.kafka.emit<UserRegisteredEvent>(KAFKA_TOPICS.USER_REGISTERED, {
      userId: user.id,
      email: user.email,
      name: user.name,
    });
    this.logger.log(`User registered: ${user.email}`);

    return {
      success: true,
      accessToken,
      refreshToken,
      message: 'Registration Successfully!',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      },
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

  async logout(accessToken: string) {
    const ttl = this.tokens.getTokenTTL(accessToken);
    if (ttl > 0) {
      await this.redis.blacklistToken(accessToken, ttl);
    }
    try {
      const payload = await this.tokens.verifyAccessToken(accessToken);
      if (payload?.userId) {
        await this.redis.deleteRefreshToken(payload.userId);
        await this.prisma.user.update({
          where: { id: payload.userId },
          data: { refreshToken: null },
        });
      }
    } catch (error) {
      console.log(error);
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
}
