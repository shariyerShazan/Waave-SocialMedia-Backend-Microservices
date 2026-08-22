import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class UserAuthDetails {
  @Field({ nullable: true })
  id?: string;

  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  role?: string;

  @Field({ nullable: true })
  createdAt?: string;
}

@ObjectType()
export class AuthResponse {
  @Field({ nullable: true })
  success?: boolean;

  @Field({ nullable: true })
  message?: string;

  @Field({ nullable: true })
  accessToken?: string;

  @Field({ nullable: true })
  refreshToken?: string;

  @Field({ nullable: true })
  requiresMfa?: boolean;

  @Field({ nullable: true })
  userId?: string;

  @Field(() => UserAuthDetails, { nullable: true })
  user?: UserAuthDetails;
}

@ObjectType()
export class UserResultResponse {
  @Field({ nullable: true })
  success?: boolean;

  @Field({ nullable: true })
  message?: string;

  @Field(() => UserAuthDetails, { nullable: true })
  user?: UserAuthDetails;
}

@ObjectType()
export class SessionInfo {
  @Field({ nullable: true })
  sessionId?: string;

  @Field({ nullable: true })
  deviceId?: string;

  @Field({ nullable: true })
  ipAddress?: string;

  @Field({ nullable: true })
  browser?: string;

  @Field({ nullable: true })
  os?: string;

  @Field({ nullable: true })
  lastActivity?: string;
}

@ObjectType()
export class ActiveSessionsResponse {
  @Field({ nullable: true })
  success?: boolean;

  @Field(() => [SessionInfo], { nullable: true })
  sessions?: SessionInfo[];
}

@ObjectType()
export class AllUsersResponse {
  @Field({ nullable: true })
  success?: boolean;

  @Field({ nullable: true })
  message?: string;

  @Field(() => [UserAuthDetails], { nullable: true })
  users?: UserAuthDetails[];

  @Field(() => Int, { nullable: true })
  total?: number;

  @Field(() => Int, { nullable: true })
  page?: number;

  @Field(() => Int, { nullable: true })
  limit?: number;
}

@InputType()
export class RegisterInput {
  @Field()
  email!: string;

  @Field()
  password!: string;

  @Field({ nullable: true })
  name?: string;
}

@InputType()
export class VerifyRegistrationInput {
  @Field()
  email!: string;

  @Field()
  otp!: string;
}

@InputType()
export class ForgotPasswordInput {
  @Field()
  email!: string;
}

@InputType()
export class ResetPasswordInput {
  @Field()
  email!: string;

  @Field()
  otp!: string;

  @Field()
  newPassword!: string;
}

@InputType()
export class LoginInput {
  @Field()
  email!: string;

  @Field()
  password!: string;

  @Field({ nullable: true })
  twoFactorCode?: string;

  @Field({ nullable: true })
  ipAddress?: string;

  @Field({ nullable: true })
  userAgent?: string;

  @Field({ nullable: true })
  deviceId?: string;
}

@InputType()
export class RefreshTokenInput {
  @Field()
  refreshToken!: string;
}

@InputType()
export class ChangePasswordInput {
  @Field()
  oldPassword!: string;

  @Field()
  newPassword!: string;
}
