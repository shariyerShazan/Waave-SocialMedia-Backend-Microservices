import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class MediaType {
  @Field({ nullable: true })
  id?: string;

  @Field({ nullable: true })
  userId?: string;

  @Field({ nullable: true })
  url?: string;

  @Field({ nullable: true })
  mimeType?: string;

  @Field({ nullable: true })
  filename?: string;

  @Field(() => Int, { nullable: true })
  size?: number;

  @Field({ nullable: true })
  status?: string;

  @Field({ nullable: true })
  createdAt?: string;
}

@ObjectType()
export class SingleMediaResponse {
  @Field({ nullable: true })
  success?: boolean;

  @Field({ nullable: true })
  message?: string;

  @Field(() => MediaType, { nullable: true })
  media?: MediaType;
}

@ObjectType()
export class MediaListResponse {
  @Field({ nullable: true })
  success?: boolean;

  @Field(() => [MediaType], { nullable: true })
  media?: MediaType[];

  @Field(() => Int, { nullable: true })
  total?: number;
}

@ObjectType()
export class MediaExistsResponse {
  @Field({ nullable: true })
  exists?: boolean;
}

@ObjectType()
export class GenericMediaActionResult {
  @Field({ nullable: true })
  success?: boolean;

  @Field({ nullable: true })
  message?: string;
}

@InputType()
export class CreateMediaInput {
  @Field()
  url!: string;

  @Field({ nullable: true })
  mimeType?: string;

  @Field({ nullable: true })
  filename?: string;

  @Field(() => Int, { nullable: true })
  size?: number;
}

@InputType()
export class UpdateMediaStatusInput {
  @Field()
  status!: string;
}
