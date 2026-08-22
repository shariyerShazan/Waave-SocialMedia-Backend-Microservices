import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class E2eeConversationType {
  @Field({ nullable: true })
  id?: string;

  @Field({ nullable: true })
  initiatorId?: string;

  @Field({ nullable: true })
  recipientId?: string;

  @Field({ nullable: true })
  createdAt?: string;
}

@ObjectType()
export class E2eeMessageType {
  @Field({ nullable: true })
  id?: string;

  @Field({ nullable: true })
  conversationId?: string;

  @Field({ nullable: true })
  senderId?: string;

  @Field({ nullable: true })
  senderDeviceId?: string;

  @Field({ nullable: true })
  createdAt?: string;
}

@ObjectType()
export class E2eeConversationResponse {
  @Field({ nullable: true })
  success?: boolean;

  @Field({ nullable: true })
  message?: string;

  @Field(() => E2eeConversationType, { nullable: true })
  conversation?: E2eeConversationType;
}

@ObjectType()
export class E2eeConversationListResponse {
  @Field({ nullable: true })
  success?: boolean;

  @Field(() => [E2eeConversationType], { nullable: true })
  conversations?: E2eeConversationType[];

  @Field(() => Int, { nullable: true })
  total?: number;
}

@ObjectType()
export class E2eeMessageResponse {
  @Field({ nullable: true })
  success?: boolean;

  @Field({ nullable: true })
  message?: string;

  @Field(() => E2eeMessageType, { nullable: true })
  encryptedMessage?: E2eeMessageType;
}

@ObjectType()
export class E2eeMessageListResponse {
  @Field({ nullable: true })
  success?: boolean;

  @Field(() => [E2eeMessageType], { nullable: true })
  messages?: E2eeMessageType[];

  @Field(() => Int, { nullable: true })
  total?: number;
}

@InputType()
export class CreateE2eeConversationInput {
  @Field()
  targetUserId!: string;
}

@InputType()
export class CipherPayloadInput {
  @Field()
  ciphertext!: string;

  @Field({ nullable: true, defaultValue: '' })
  iv?: string;

  @Field({ nullable: true, defaultValue: '' })
  authTag?: string;

  @Field({ nullable: true })
  ratchetHeader?: string;

  @Field({ nullable: true })
  ephemeralKey?: string;

  @Field(() => Int, { nullable: true })
  oneTimePreKeyId?: number;

  @Field(() => Int, { nullable: true })
  signedPreKeyId?: number;
}

@InputType()
export class EncryptedEnvelopeInput {
  @Field()
  recipientUserId!: string;

  @Field()
  recipientDeviceId!: string;

  @Field(() => CipherPayloadInput)
  payload!: CipherPayloadInput;
}

@InputType()
export class SendEncryptedMessageInput {
  @Field()
  conversationId!: string;

  @Field({ nullable: true })
  senderDeviceId?: string;

  @Field({ nullable: true, defaultValue: 'text' })
  type?: string;

  @Field(() => [EncryptedEnvelopeInput], { defaultValue: [] })
  envelopes!: EncryptedEnvelopeInput[];
}
