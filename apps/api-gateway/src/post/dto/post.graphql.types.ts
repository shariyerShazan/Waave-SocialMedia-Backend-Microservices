import { Field, InputType, Int, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum PostPrivacyGql {
  PUBLIC = 'PUBLIC',
  FRIENDS = 'FRIENDS',
  PRIVATE = 'PRIVATE',
}

registerEnumType(PostPrivacyGql, {
  name: 'PostPrivacyGql',
});

@ObjectType()
export class CommentType {
  @Field({ nullable: true })
  id?: string;

  @Field({ nullable: true })
  postId?: string;

  @Field({ nullable: true })
  userId?: string;

  @Field({ nullable: true })
  text?: string;

  @Field({ nullable: true })
  parentId?: string;

  @Field({ nullable: true })
  createdAt?: string;
}

@ObjectType()
export class PostType {
  @Field({ nullable: true })
  id?: string;

  @Field({ nullable: true })
  userId?: string;

  @Field({ nullable: true })
  content?: string;

  @Field(() => [String], { nullable: true })
  mediaIds?: string[];

  @Field({ nullable: true })
  feeling?: string;

  @Field({ nullable: true })
  location?: string;

  @Field(() => PostPrivacyGql, { nullable: true })
  privacy?: PostPrivacyGql;

  @Field(() => Int, { nullable: true })
  likesCount?: number;

  @Field(() => Int, { nullable: true })
  commentsCount?: number;

  @Field(() => Int, { nullable: true })
  sharesCount?: number;

  @Field(() => Int, { nullable: true })
  viewsCount?: number;

  @Field(() => Boolean, { nullable: true })
  isLiked?: boolean;

  @Field(() => Boolean, { nullable: true })
  isBookmarked?: boolean;

  @Field({ nullable: true })
  createdAt?: string;
}

@ObjectType()
export class PostResponse {
  @Field({ nullable: true })
  success?: boolean;

  @Field({ nullable: true })
  message?: string;

  @Field(() => PostType, { nullable: true })
  post?: PostType;
}

@ObjectType()
export class PostListResponse {
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
export class CommentListResponse {
  @Field({ nullable: true })
  success?: boolean;

  @Field(() => [CommentType], { nullable: true })
  comments?: CommentType[];

  @Field(() => Int, { nullable: true })
  total?: number;
}

@ObjectType()
export class CommentResponse {
  @Field({ nullable: true })
  success?: boolean;

  @Field({ nullable: true })
  message?: string;

  @Field(() => CommentType, { nullable: true })
  comment?: CommentType;
}

@ObjectType()
export class GenericPostActionResult {
  @Field({ nullable: true })
  success?: boolean;

  @Field({ nullable: true })
  message?: string;
}

@InputType()
export class CreatePostInput {
  @Field()
  content!: string;

  @Field(() => [String], { nullable: true })
  mediaIds?: string[];

  @Field({ nullable: true })
  feeling?: string;

  @Field({ nullable: true })
  location?: string;

  @Field(() => PostPrivacyGql, { nullable: true })
  privacy?: PostPrivacyGql;
}

@InputType()
export class UpdatePostInput {
  @Field({ nullable: true })
  content?: string;

  @Field(() => PostPrivacyGql, { nullable: true })
  privacy?: PostPrivacyGql;
}

@InputType()
export class SharePostInput {
  @Field({ nullable: true })
  comment?: string;
}

@InputType()
export class AddCommentInput {
  @Field()
  text!: string;

  @Field({ nullable: true })
  parentId?: string;
}
