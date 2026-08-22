import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class UserProfileType {
  @Field({ nullable: true })
  id?: string;

  @Field({ nullable: true })
  userId?: string;

  @Field({ nullable: true })
  username?: string;

  @Field({ nullable: true })
  displayName?: string;

  @Field({ nullable: true })
  avatarUrl?: string;

  @Field({ nullable: true })
  bio?: string;

  @Field({ nullable: true })
  website?: string;

  @Field({ nullable: true })
  location?: string;

  @Field(() => Int, { nullable: true })
  followersCount?: number;

  @Field(() => Int, { nullable: true })
  followingCount?: number;

  @Field(() => Boolean, { nullable: true })
  isFollowing?: boolean;
}

@ObjectType()
export class GenericUserResponse {
  @Field({ nullable: true })
  success?: boolean;

  @Field({ nullable: true })
  message?: string;

  @Field(() => UserProfileType, { nullable: true })
  profile?: UserProfileType;
}

@ObjectType()
export class FollowListResponse {
  @Field({ nullable: true })
  success?: boolean;

  @Field(() => [UserProfileType], { nullable: true })
  users?: UserProfileType[];

  @Field(() => Int, { nullable: true })
  total?: number;
}

@ObjectType()
export class IsFollowingResponse {
  @Field({ nullable: true })
  isFollowing?: boolean;
}

@ObjectType()
export class OnlineStatusResponse {
  @Field({ nullable: true })
  userId?: string;

  @Field({ nullable: true })
  isOnline?: boolean;

  @Field({ nullable: true })
  lastSeen?: string;
}

@ObjectType()
export class DeviceType {
  @Field({ nullable: true })
  deviceId?: string;

  @Field({ nullable: true })
  deviceName?: string;

  @Field({ nullable: true })
  platform?: string;

  @Field({ nullable: true })
  osVersion?: string;

  @Field({ nullable: true })
  appVersion?: string;

  @Field({ nullable: true })
  createdAt?: string;
}

@ObjectType()
export class ListDevicesResponse {
  @Field({ nullable: true })
  success?: boolean;

  @Field(() => [DeviceType], { nullable: true })
  devices?: DeviceType[];
}

@ObjectType()
export class KeyBundleResponse {
  @Field({ nullable: true })
  success?: boolean;

  @Field({ nullable: true })
  userId?: string;

  @Field({ nullable: true })
  deviceId?: string;

  @Field({ nullable: true })
  identityKey?: string;

  @Field({ nullable: true })
  signedPreKey?: string;

  @Field({ nullable: true })
  signedPreKeySig?: string;

  @Field({ nullable: true })
  oneTimePreKey?: string;
}

@ObjectType()
export class OtkCountResponse {
  @Field({ nullable: true })
  success?: boolean;

  @Field(() => Int, { nullable: true })
  count?: number;
}

@InputType()
export class UpdateProfileInput {
  @Field({ nullable: true })
  displayName?: string;

  @Field({ nullable: true })
  bio?: string;

  @Field({ nullable: true })
  avatarUrl?: string;

  @Field({ nullable: true })
  website?: string;

  @Field({ nullable: true })
  location?: string;
}

@InputType()
export class RegisterDeviceInput {
  @Field()
  deviceId!: string;

  @Field()
  deviceName!: string;

  @Field()
  platform!: string;

  @Field({ nullable: true })
  osVersion?: string;

  @Field({ nullable: true })
  appVersion?: string;
}

@InputType()
export class IdentityKeyInput {
  @Field()
  publicKey!: string;

  @Field(() => Int)
  registrationId!: number;
}

@InputType()
export class SignedPreKeyInput {
  @Field(() => Int)
  keyId!: number;

  @Field()
  publicKey!: string;

  @Field()
  signature!: string;
}

@InputType()
export class OneTimePreKeyInput {
  @Field(() => Int)
  keyId!: number;

  @Field()
  publicKey!: string;
}

@InputType()
export class UploadKeysInput {
  @Field()
  deviceId!: string;

  @Field(() => IdentityKeyInput)
  identityKey!: IdentityKeyInput;

  @Field(() => SignedPreKeyInput)
  signedPreKey!: SignedPreKeyInput;

  @Field(() => [OneTimePreKeyInput], { defaultValue: [] })
  oneTimePreKeys!: OneTimePreKeyInput[];
}

@InputType()
export class RotateSignedPreKeyInput {
  @Field()
  deviceId!: string;

  @Field(() => SignedPreKeyInput)
  signedPreKey!: SignedPreKeyInput;
}

@InputType()
export class RefillOneTimePreKeysInput {
  @Field()
  deviceId!: string;

  @Field(() => [OneTimePreKeyInput])
  oneTimePreKeys!: OneTimePreKeyInput[];
}
