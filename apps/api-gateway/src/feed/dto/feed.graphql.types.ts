import { Field, Int, ObjectType } from '@nestjs/graphql';
import { PostType } from '../../post/dto/post.graphql.types';

@ObjectType()
export class FeedResponse {
  @Field({ nullable: true })
  success?: boolean;

  @Field(() => [PostType], { nullable: true })
  posts?: PostType[];

  @Field(() => Int, { nullable: true })
  total?: number;

  @Field({ nullable: true })
  nextCursor?: string;
}

@ObjectType()
export class InvalidateFeedResponse {
  @Field({ nullable: true })
  success?: boolean;

  @Field({ nullable: true })
  message?: string;
}
