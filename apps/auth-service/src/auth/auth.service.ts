import { Injectable, Logger } from '@nestjs/common';
import { TokenService } from '../token/token.service';
import { AuthRedisService } from '../redis/redis.service';
import { KAFKA_TOPICS, KafkaService } from '@app/kafka';
import { RpcException } from '@nestjs/microservices';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import {
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
import { SessionService } from './services/session.service';
import { DeviceService } from './services/device.service';
import { MfaService } from './services/mfa.service';

export interface UserLoginEvent {
  userId: string;
  email: string;
}

export interface LoginResponse {
  success: boolean;
  requiresMfa?: boolean;
  userId?: string;
  accessToken?: string;
  refreshToken?: string;
  message: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
  };
}

export interface CachedUserResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface CachedAllUsersResponse {
  users: CachedUserResponse[];
  total: number;
}

@Injectable()
export class AuthService {
  private logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: AtuhPrismaService,
    private readonly tokens: TokenService,
    private readonly redis: AuthRedisService,
    private readonly kafka: KafkaService,
    private readonly sessionService: SessionService,
    private readonly deviceService: DeviceService,
    private readonly mfaService: MfaService,
  ) {}

  private hashTokenStr(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

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

    const hashSolt = Number(process.env.HASH_SOLT || '10');
    const hashPass = await bcrypt.hash(dto.password, hashSolt);

    const authUser = !userExist
      ? await this.prisma.writeDb.user.create({
          data: {
            email: dto.email,
            credential: {
              create: {
                passwordHash: hashPass,
              },
            },
            securityState: {
              create: {
                failedLoginAttempts: 0,
              },
            },
          },
        })
      : await this.prisma.writeDb.user.update({
          where: { email: dto.email },
          data: {
            credential: {
              update: {
                passwordHash: hashPass,
              },
            },
          },
        });

    const otp = await this.redis.createOtp(
      dto.email,
      KAFKA_TOPICS.USER_REGISTERED,
    );

    const registerEvent: UserRegisteredEvent = {
      userId: authUser.id,
      email: authUser.email,
      name: dto.name,
    };

    await this.kafka.emit(KAFKA_TOPICS.USER_REGISTERED, registerEvent);

    const sendOtpEvent: SendRegistrationOtpEvent = {
      email: authUser.email,
      name: dto.name,
      otp,
    };

    await this.kafka.emit(KAFKA_TOPICS.SEND_REGISTRATION_OTP, sendOtpEvent);

    return {
      success: true,
      message: 'Registered. Verify Your otp!',
    };
  }

  async verifyRegistration(dto: VerifyRegistrationDto) {
    const email = dto.email;
    const otp = dto.otp;
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
      name: '',
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
    const email = dto.email;
    const otp = dto.otp;

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

    const user = await this.prisma.readDb.user.findUnique({
      where: { email },
      include: { credential: true },
    });

    if (!user) {
      throw new RpcException({
        code: 5,
        message: 'User not found',
      });
    }

    const hashSolt = Number(process.env.HASH_SOLT || '10');
    const hashPass = await bcrypt.hash(dto.newPassword, hashSolt);

    const isPrevMatch = await bcrypt.compare(
      dto.newPassword,
      user.credential?.passwordHash || '',
    );
    if (isPrevMatch) {
      throw new RpcException({
        code: 3,
        message: 'New password cannot be the same as old password',
      });
    }

    const histories = await this.prisma.readDb.passwordHistory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    for (const h of histories) {
      const match = await bcrypt.compare(dto.newPassword, h.passwordHash);
      if (match) {
        throw new RpcException({
          code: 3,
          message: 'Password reuse is not allowed. Try another password.',
        });
      }
    }

    await this.prisma.writeDb.$transaction([
      this.prisma.writeDb.userCredential.update({
        where: { userId: user.id },
        data: {
          passwordHash: hashPass,
          credentialVersion: { increment: 1 },
        },
      }),
      this.prisma.writeDb.passwordHistory.create({
        data: {
          userId: user.id,
          passwordHash: hashPass,
        },
      }),
    ]);

    await this.sessionService.revokeAllSessions(user.id);
    await this.redis.deleteOtp(email, KAFKA_TOPICS.USER_FORGOT_PASS_REQUEST);

    return {
      success: true,
      message: 'Resent Password Successfully! Please login',
    };
  }

  async changePassword(dto: ChangePassRequest) {
    const user = await this.prisma.readDb.user.findUnique({
      where: { id: dto.userId },
      include: { credential: true },
    });
    if (!user) {
      throw new RpcException({
        code: 16,
        message: 'User not found',
      });
    }
    if (!user.isEmailVerified) {
      throw new RpcException({
        code: 16,
        message: 'User not Email Verified',
      });
    }

    const isValidPass = await bcrypt.compare(
      dto.oldPassword,
      user.credential?.passwordHash || '',
    );
    if (!isValidPass) {
      throw new RpcException({
        code: 16,
        message: 'Old password is incorrect!',
      });
    }

    const hashSolt = Number(process.env.HASH_SOLT || '10');
    const hashPass = await bcrypt.hash(dto.newPassword, hashSolt);

    const histories = await this.prisma.readDb.passwordHistory.findMany({
      where: { userId: dto.userId },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    for (const h of histories) {
      const match = await bcrypt.compare(dto.newPassword, h.passwordHash);
      if (match) {
        throw new RpcException({
          code: 3,
          message: 'Password reuse is not allowed. Try another password.',
        });
      }
    }

    await this.prisma.writeDb.$transaction([
      this.prisma.writeDb.userCredential.update({
        where: { userId: dto.userId },
        data: {
          passwordHash: hashPass,
          credentialVersion: { increment: 1 },
        },
      }),
      this.prisma.writeDb.passwordHistory.create({
        data: {
          userId: dto.userId,
          passwordHash: hashPass,
        },
      }),
    ]);

    await this.sessionService.revokeAllSessions(dto.userId);

    return {
      success: true,
      message: 'Password change Successfully!',
    };
  }

  async login(dto: LoginDto): Promise<LoginResponse> {
    const maxAttempts = Number(process.env.MAX_LOGIN_ATTEMPTS || '5');
    const attempts = await this.redis.getLoginAttempts(dto.email);

    if (attempts >= maxAttempts) {
      throw new RpcException({
        code: 8,
        message: 'Too many login attempts. Try again in 15 minutes.',
      });
    }

    const user = await this.prisma.readDb.user.findUnique({
      where: { email: dto.email },
      include: { credential: true, securityState: true },
    });

    if (!user) {
      await this.redis.incrementLoginAttempts(dto.email);
      throw new RpcException({
        code: 16,
        message: 'Credentials incorrect',
      });
    }

    if (
      user.securityState?.lockUntil &&
      user.securityState.lockUntil.getTime() > Date.now()
    ) {
      throw new RpcException({
        code: 8,
        message: 'Account is temporarily locked. Try again later.',
      });
    }

    const isValidPass = await bcrypt.compare(
      dto.password,
      user.credential?.passwordHash || '',
    );

    if (!isValidPass) {
      const currentAttempts = await this.redis.incrementLoginAttempts(
        dto.email,
      );
      await this.prisma.writeDb.securityState.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          failedLoginAttempts: 1,
        },
        update: {
          failedLoginAttempts: { increment: 1 },
        },
      });

      if (currentAttempts >= maxAttempts) {
        const lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        await this.prisma.writeDb.securityState.update({
          where: { userId: user.id },
          data: { lockUntil },
        });
      }

      await this.prisma.writeDb.loginHistory.create({
        data: {
          userId: user.id,
          email: dto.email,
          success: false,
          failureReason: 'Password incorrect',
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent,
          deviceId: dto.deviceId,
        },
      });

      throw new RpcException({
        code: 16,
        message: 'Credentials incorrect',
      });
    }

    await this.redis.resetLoginAttempts(dto.email);
    await this.prisma.writeDb.securityState.update({
      where: { userId: user.id },
      data: { failedLoginAttempts: 0, lockUntil: null },
    });

    const mfa = await this.prisma.readDb.twoFactorAuth.findUnique({
      where: { userId: user.id },
    });

    if (mfa && mfa.isEnabled) {
      if (!dto.twoFactorCode) {
        await this.redis.saveMfaTempState(user.id, dto, 300);
        return {
          success: false,
          requiresMfa: true,
          userId: user.id,
          message: 'MFA verification required',
        };
      }

      const mfaValid = await this.mfaService.verifyMfa(
        user.id,
        dto.twoFactorCode,
      );
      if (!mfaValid) {
        throw new RpcException({
          code: 16,
          message: 'Invalid MFA verification code',
        });
      }
    }

    const deviceId = dto.deviceId || uuidv4();
    const fingerprint =
      dto.deviceFingerprint || dto.userAgent || 'unknown-device';

    const session = await this.sessionService.createSession(
      user.id,
      deviceId,
      fingerprint,
      dto.ipAddress,
      dto.userAgent,
    );

    const tokenVersion = user.securityState?.tokenVersion || 1;
    const jtiAccess = uuidv4();
    const jtiRefresh = uuidv4();
    const familyId = uuidv4();

    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      deviceId,
      deviceFingerprint: fingerprint,
    };

    const accessToken = this.tokens.generateAccessToken(
      payload,
      jtiAccess,
      session.id,
      tokenVersion,
    );

    const refreshToken = this.tokens.generateRefreshToken(
      user.id,
      jtiRefresh,
      familyId,
    );

    const refreshHash = this.hashTokenStr(refreshToken);
    const refreshTtl = this.tokens.getTokenTTL(refreshToken);

    await this.prisma.writeDb.$transaction([
      this.prisma.writeDb.refreshTokenFamily.create({
        data: {
          id: familyId,
          userId: user.id,
          deviceFingerprint: fingerprint,
          status: 'ACTIVE',
        },
      }),
      this.prisma.writeDb.refreshToken.create({
        data: {
          id: jtiRefresh,
          familyId,
          userId: user.id,
          tokenHash: refreshHash,
          expiresAt: new Date(Date.now() + refreshTtl * 1000),
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent,
        },
      }),
      this.prisma.writeDb.loginHistory.create({
        data: {
          userId: user.id,
          email: user.email,
          success: true,
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent,
          deviceId,
          sessionId: session.id,
          mfaUsed: !!mfa?.isEnabled,
        },
      }),
    ]);

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
        name: '',
        email: user.email,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      },
    };
  }

  async logout(userId: string, sessionId?: string) {
    try {
      if (sessionId) {
        await this.sessionService.revokeSession(userId, sessionId);
      } else {
        await this.sessionService.revokeAllSessions(userId);
      }
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
        deviceId: '',
      };
    }

    const state = await this.prisma.readDb.securityState.findUnique({
      where: { userId: payload.userId },
    });

    if (
      state &&
      payload.tokenVersion !== undefined &&
      payload.tokenVersion < state.tokenVersion
    ) {
      return {
        valid: false,
        userId: '',
        email: '',
        role: '',
        message: 'Token version has been invalidated',
        deviceId: '',
      };
    }

    if (payload.sid) {
      const active = await this.sessionService.validateSession(payload.sid);
      if (!active) {
        return {
          valid: false,
          userId: '',
          email: '',
          role: '',
          message: 'Session has been revoked or expired',
          deviceId: '',
        };
      }
    }

    return {
      valid: true,
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      message: 'Token valid',
      deviceId: payload.deviceId || '',
    };
  }

  async refreshToken(
    refreshToken: string,
    deviceId?: string,
    deviceFingerprint?: string,
  ) {
    const payload = this.tokens.verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new RpcException({
        code: 16,
        message: 'Invalid refresh token',
      });
    }

    const hash = this.hashTokenStr(refreshToken);
    const dbToken = await this.prisma.readDb.refreshToken.findUnique({
      where: { tokenHash: hash },
      include: { family: true },
    });

    if (!dbToken) {
      throw new RpcException({
        code: 16,
        message: 'Refresh token match not found',
      });
    }

    if (
      dbToken.status === 'REVOKED' ||
      dbToken.expiresAt.getTime() < Date.now()
    ) {
      throw new RpcException({
        code: 16,
        message: 'Refresh token has expired or is revoked',
      });
    }

    if (dbToken.status === 'USED' || dbToken.family.status === 'REVOKED') {
      await this.prisma.writeDb.$transaction([
        this.prisma.writeDb.refreshTokenFamily.update({
          where: { id: dbToken.familyId },
          data: { status: 'REVOKED' },
        }),
        this.prisma.writeDb.refreshToken.updateMany({
          where: { familyId: dbToken.familyId },
          data: { status: 'REVOKED' },
        }),
      ]);

      await this.sessionService.revokeAllSessions(payload.userId);

      throw new RpcException({
        code: 16,
        message:
          'Breach detected: Refresh token has already been rotated. Invalidating all families.',
      });
    }

    const user = await this.prisma.readDb.user.findUnique({
      where: { id: payload.userId },
      include: { securityState: true },
    });

    if (!user) {
      throw new RpcException({
        code: 5,
        message: 'User not found',
      });
    }

    const activeSession = await this.prisma.readDb.session.findFirst({
      where: {
        userId: user.id,
        isRevoked: false,
        deviceFingerprint:
          deviceFingerprint || dbToken.family.deviceFingerprint,
      },
    });

    const sid = activeSession ? activeSession.id : uuidv4();
    if (!activeSession) {
      await this.sessionService.createSession(
        user.id,
        deviceId || uuidv4(),
        deviceFingerprint || dbToken.family.deviceFingerprint,
      );
    }

    const tokenVersion = user.securityState?.tokenVersion || 1;
    const jtiAccess = uuidv4();
    const jtiRefresh = uuidv4();

    const newAccessToken = this.tokens.generateAccessToken(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        deviceId: deviceId || activeSession?.deviceId || uuidv4(),
      },
      jtiAccess,
      sid,
      tokenVersion,
    );

    const newRefreshToken = this.tokens.generateRefreshToken(
      user.id,
      jtiRefresh,
      dbToken.familyId,
    );

    const newRefreshHash = this.hashTokenStr(newRefreshToken);
    const refreshTtl = this.tokens.getTokenTTL(newRefreshToken);

    await this.prisma.writeDb.$transaction([
      this.prisma.writeDb.refreshToken.update({
        where: { id: dbToken.id },
        data: {
          status: 'USED',
          usedAt: new Date(),
        },
      }),
      this.prisma.writeDb.refreshToken.create({
        data: {
          id: jtiRefresh,
          familyId: dbToken.familyId,
          userId: user.id,
          tokenHash: newRefreshHash,
          expiresAt: new Date(Date.now() + refreshTtl * 1000),
        },
      }),
    ]);

    return {
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      message: 'Token refreshed',
      user: {
        id: user.id,
        name: '',
        email: user.email,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      },
    };
  }

  async verifyMfa(
    userId: string,
    code: string,
  ): Promise<LoginResponse | { success: boolean; message: string }> {
    const verified = await this.mfaService.verifyMfa(userId, code);
    if (!verified) {
      throw new RpcException({
        code: 16,
        message: 'Invalid OTP code',
      });
    }

    const tempState = await this.redis.getMfaTempState<LoginDto>(userId);
    if (!tempState) {
      return {
        success: true,
        message: 'OTP Verified successfully',
      };
    }

    await this.redis.deleteMfaTempState(userId);
    const loginResult = await this.login({
      ...tempState,
      twoFactorCode: code,
    });

    return {
      ...loginResult,
      success: true,
      message: 'OTP login successful',
    };
  }

  async getActiveSessions(userId: string) {
    const sessions = await this.sessionService.getActiveSessions(userId);
    return {
      success: true,
      sessions: sessions.map((s) => ({
        sessionId: s.id,
        deviceId: s.deviceId,
        ipAddress: s.ipAddress || '',
        browser: s.browser || '',
        os: s.os || '',
        lastActivity: s.lastActivity.toISOString(),
      })),
    };
  }

  async revokeSession(userId: string, sessionId: string) {
    const locked = await this.redis.acquireDistributedLock(userId);
    if (!locked) {
      throw new RpcException({
        code: 10,
        message: 'Database update is currently locked, please retry',
      });
    }

    try {
      await this.sessionService.revokeSession(userId, sessionId);
    } finally {
      await this.redis.releaseDistributedLock(userId);
    }

    return {
      success: true,
      message: 'Session revoked successfully',
    };
  }

  async revokeAllSessions(userId: string) {
    const locked = await this.redis.acquireDistributedLock(userId);
    if (!locked) {
      throw new RpcException({
        code: 10,
        message: 'Database update is currently locked, please retry',
      });
    }

    try {
      await this.sessionService.revokeAllSessions(userId);
    } finally {
      await this.redis.releaseDistributedLock(userId);
    }

    return {
      success: true,
      message: 'All sessions successfully revoked',
    };
  }

  async getUserById(userId: string) {
    const cacheKey = `user:id:${userId}`;

    const cachedUser = await this.redis.getCache<CachedUserResponse>(cacheKey);
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
      name: '',
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

    const cachedUser = await this.redis.getCache<CachedUserResponse>(cacheKey);
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
      name: '',
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

    const cachedData =
      await this.redis.getCache<CachedAllUsersResponse>(cacheKey);

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
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.readDb.user.count(),
    ]);

    const usersData = users.map((user) => ({
      id: user.id,
      name: '',
      email: user.email,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    }));

    const responseData = {
      users: usersData,
      total,
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
