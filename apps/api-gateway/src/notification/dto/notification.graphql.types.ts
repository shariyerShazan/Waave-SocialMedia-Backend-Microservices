import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class NotificationType {
  @Field({ nullable: true })
  id?: string;

  @Field({ nullable: true })
  userId?: string;

  @Field({ nullable: true })
  actorId?: string;

  @Field({ nullable: true })
  type?: string;

  @Field({ nullable: true })
  title?: string;

  @Field({ nullable: true })
  message?: string;

  @Field({ nullable: true })
  entityId?: string;

  @Field({ nullable: true })
  isRead?: boolean;

  @Field({ nullable: true })
  createdAt?: string;
}

@ObjectType()
export class NotificationListResponse {
  @Field({ nullable: true })
  success?: boolean;

  @Field(() => [NotificationType], { nullable: true })
  notifications?: NotificationType[];

  @Field(() => Int, { nullable: true })
  total?: number;

  @Field(() => Int, { nullable: true })
  unreadCount?: number;
}

@ObjectType()
export class NotificationPreferencesType {
  @Field({ nullable: true })
  likes?: boolean;

  @Field({ nullable: true })
  comments?: boolean;

  @Field({ nullable: true })
  follows?: boolean;

  @Field({ nullable: true })
  unfollows?: boolean;

  @Field({ nullable: true })
  mentions?: boolean;

  @Field({ nullable: true })
  messages?: boolean;
}

@ObjectType()
export class NotificationPreferencesResponse {
  @Field({ nullable: true })
  success?: boolean;

  @Field(() => NotificationPreferencesType, { nullable: true })
  preferences?: NotificationPreferencesType;
}

@ObjectType()
export class GenericNotificationActionResult {
  @Field({ nullable: true })
  success?: boolean;

  @Field({ nullable: true })
  message?: string;
}

@InputType()
export class UpdateNotificationPreferencesInput {
  @Field({ nullable: true })
  likes?: boolean;

  @Field({ nullable: true })
  comments?: boolean;

  @Field({ nullable: true })
  follows?: boolean;

  @Field({ nullable: true })
  unfollows?: boolean;

  @Field({ nullable: true })
  mentions?: boolean;

  @Field({ nullable: true })
  messages?: boolean;
}
