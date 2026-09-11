/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthGuard } from '@app/common';
import { AuthGrpcClient } from 'libs/grpc-clients/src';
import { RateLimitGuard } from '../rateLimit/guard/rate-limit.guard';
import {
  RateLimit,
  RateLimitKeyType,
} from '../rateLimit/decorator/rate-limit.decorator';
import {
  ActiveSessionsResponse,
  AllUsersResponse,
  AuthResponse,
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RefreshTokenInput,
  RegisterInput,
  ResetPasswordInput,
  UserResultResponse,
  VerifyRegistrationInput,
} from './dto/auth.graphql.types';

@Resolver()
export class AuthResolver {
  constructor(private readonly authClient: AuthGrpcClient) {}

  @Mutation(() => AuthResponse)
  @UseGuards(RateLimitGuard)
  @RateLimit(5, 60, { key: RateLimitKeyType.IP_EMAIL })
  register(@Args('input') input: RegisterInput) {
    return this.authClient.register(input);
  }

  @Mutation(() => AuthResponse)
  @UseGuards(RateLimitGuard)
  @RateLimit(5, 60, { key: RateLimitKeyType.IP_EMAIL })
  verifyRegistration(@Args('input') input: VerifyRegistrationInput) {
    return this.authClient.verifyRegistration(input);
  }

  @Mutation(() => AuthResponse)
  @UseGuards(RateLimitGuard)
  @RateLimit(5, 60, { key: RateLimitKeyType.IP_EMAIL })
  forgotPassword(@Args('input') input: ForgotPasswordInput) {
    return this.authClient.forgotPasswordRequest(input);
  }

  @Mutation(() => AuthResponse)
  @UseGuards(RateLimitGuard)
  @RateLimit(5, 60, { key: RateLimitKeyType.IP_EMAIL })
  resetPassword(@Args('input') input: ResetPasswordInput) {
    return this.authClient.resetPassword(input);
  }

  @Mutation(() => AuthResponse)
  @UseGuards(RateLimitGuard)
  @RateLimit(5, 60, { key: RateLimitKeyType.IP_EMAIL })
  login(@Args('input') input: LoginInput) {
    return this.authClient.login(input);
  }

  @Mutation(() => AuthResponse)
  @UseGuards(RateLimitGuard)
  @RateLimit(5, 60, { key: RateLimitKeyType.IP_EMAIL })
  refreshToken(@Args('input') input: RefreshTokenInput) {
    return this.authClient.refreshToken(input.refreshToken);
  }

  @Mutation(() => AuthResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(20, 60, { key: RateLimitKeyType.IP_USER_ID })
  revokeSession(@Context() ctx: any, @Args('sessionId') sessionId: string) {
    return this.authClient.revokeSession(ctx.req.user.userId, sessionId);
  }

  @Mutation(() => AuthResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(20, 60, { key: RateLimitKeyType.IP_USER_ID })
  revokeAllSessions(@Context() ctx: any) {
    return this.authClient.revokeAllSessions(ctx.req.user.userId);
  }

  @Query(() => ActiveSessionsResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(20, 60, { key: RateLimitKeyType.IP_USER_ID })
  activeSessions(@Context() ctx: any) {
    return this.authClient.getActiveSessions(ctx.req.user.userId);
  }

  @Mutation(() => AuthResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(20, 60, { key: RateLimitKeyType.IP_USER_ID })
  verifyMfa(@Context() ctx: any, @Args('code') code: string) {
    return this.authClient.verifyMfa(ctx.req.user.userId, code);
  }

  @Mutation(() => AuthResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(20, 60, { key: RateLimitKeyType.IP_USER_ID })
  changePassword(
    @Context() ctx: any,
    @Args('input') input: ChangePasswordInput,
  ) {
    return this.authClient.changePassword(ctx?.req?.user?.userId, input);
  }

  @Mutation(() => AuthResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(20, 60, { key: RateLimitKeyType.IP_USER_ID })
  logout(@Context() ctx: any) {
    return this.authClient.logout(ctx?.req?.user?.userId);
  }

  @Query(() => UserResultResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(20, 60, { key: RateLimitKeyType.IP_USER_ID })
  me(@Context() ctx: any) {
    return this.authClient.getMe(ctx?.req?.user?.userId);
  }

  @Query(() => AllUsersResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(20, 60, { key: RateLimitKeyType.IP_USER_ID })
  allUsers(
    @Args('page', { nullable: true, defaultValue: 1 }) page: number,
    @Args('limit', { nullable: true, defaultValue: 10 }) limit: number,
  ) {
    return this.authClient.getAllUsers(page, limit);
  }

  @Query(() => UserResultResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(20, 60, { key: RateLimitKeyType.IP_USER_ID })
  userById(@Args('userId') userId: string) {
    return this.authClient.getUserById(userId);
  }

  @Query(() => UserResultResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(20, 60, { key: RateLimitKeyType.IP_USER_ID })
  userByEmail(@Args('email') email: string) {
    return this.authClient.getUserByEmail(email);
  }
}
