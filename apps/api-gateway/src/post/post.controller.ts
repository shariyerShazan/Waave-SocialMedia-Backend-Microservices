import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import * as Express from 'express';
import { AuthGuard } from '@app/common';
import { RateLimitGuard } from '../rateLimit/guard/rate-limit.guard';
import {
  RateLimit,
  RateLimitKeyType,
} from '../rateLimit/decorator/rate-limit.decorator';
import { PostClient } from './post.clinet';
import { CreatePostDto } from '@app/common/dto/post/create-post.dto';
import { UpdatePostDto } from '@app/common/dto/post/update-post.dto';
import { SharePostDto } from '@app/common/dto/post/share-post.dto';
import { AddCommentDto } from '@app/common/dto/post/add-comment.dto';
import { GetPostsByIdsDto } from '@app/common/dto/post/get-posts-by-ids.dto';
import { PostPrivacy } from '@app/proto-schema/protos-types/post';

const privacyMap = {
  PUBLIC: PostPrivacy.PUBLIC,
  FRIENDS: PostPrivacy.FRIENDS,
  PRIVATE: PostPrivacy.PRIVATE,
} as const;

@ApiTags('Posts')
@Controller('posts')
export class PostController {
  constructor(private readonly postClient: PostClient) {}

  @Post()
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(20, 60, { key: RateLimitKeyType.IP_USER_ID })
  @ApiBearerAuth()
  createPost(@Req() req: Express.Request, @Body() dto: CreatePostDto) {
    return this.postClient.createPost({
      userId: req.user.userId,
      content: dto.content,
      mediaIds: dto.mediaIds ?? [],
      feeling: dto.feeling ?? '',
      location: dto.location ?? '',
      privacy: dto.privacy ? privacyMap[dto.privacy] : PostPrivacy.PUBLIC,
    });
  }

  @Get(':postId')
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  @ApiBearerAuth()
  getPost(@Param('postId') postId: string, @Req() req: Express.Request) {
    return this.postClient.getPost(postId, req.user.userId);
  }

  @Patch(':postId')
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(20, 60, { key: RateLimitKeyType.IP_USER_ID })
  @ApiBearerAuth()
  updatePost(
    @Param('postId') postId: string,
    @Req() req: Express.Request,
    @Body() dto: UpdatePostDto,
  ) {
    return this.postClient.updatePost(postId, req.user.userId, {
      content: dto.content,
      privacy: dto.privacy
        ? privacyMap[dto.privacy as keyof typeof privacyMap]
        : undefined,
    });
  }

  @Delete(':postId')
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(20, 60, { key: RateLimitKeyType.IP_USER_ID })
  @ApiBearerAuth()
  deletePost(@Param('postId') postId: string, @Req() req: Express.Request) {
    return this.postClient.deletePost(postId, req.user.userId);
  }

  @Get('user/:userId')
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  @ApiBearerAuth()
  getUserPosts(
    @Param('userId') userId: string,
    @Req() req: Express.Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.postClient.getUserPosts(
      userId,
      req.user.userId,
      Number(page || 1),
      Number(limit || 20),
    );
  }

  @Post(':postId/like')
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(100, 60, { key: RateLimitKeyType.IP_USER_ID })
  @ApiBearerAuth()
  likePost(@Param('postId') postId: string, @Req() req: Express.Request) {
    return this.postClient.likePost(postId, req.user.userId);
  }

  @Delete(':postId/like')
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(100, 60, { key: RateLimitKeyType.IP_USER_ID })
  @ApiBearerAuth()
  unlikePost(@Param('postId') postId: string, @Req() req: Express.Request) {
    return this.postClient.unlikePost(postId, req.user.userId);
  }

  @Post(':postId/bookmark')
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(100, 60, { key: RateLimitKeyType.IP_USER_ID })
  @ApiBearerAuth()
  bookmarkPost(@Param('postId') postId: string, @Req() req: Express.Request) {
    return this.postClient.bookmarkPost(postId, req.user.userId);
  }

  @Post(':postId/share')
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(30, 60, { key: RateLimitKeyType.IP_USER_ID })
  @ApiBearerAuth()
  sharePost(
    @Param('postId') postId: string,
    @Req() req: Express.Request,
    @Body() dto: SharePostDto,
  ) {
    return this.postClient.sharePost(postId, req.user.userId, dto.comment);
  }

  @Post(':postId/comments')
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  @ApiBearerAuth()
  addComment(
    @Param('postId') postId: string,
    @Req() req: Express.Request,
    @Body() dto: AddCommentDto,
  ) {
    return this.postClient.addComment(
      postId,
      req.user.userId,
      dto.text,
      dto.parentId,
    );
  }

  @Get(':postId/comments')
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(100, 60, { key: RateLimitKeyType.IP_USER_ID })
  @ApiBearerAuth()
  getComments(
    @Param('postId') postId: string,
    @Query('parentId') parentId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.postClient.getComments(
      postId,
      parentId,
      Number(page || 1),
      Number(limit || 20),
    );
  }

  @Post('by-ids')
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  @ApiBearerAuth()
  getPostsByIds(@Req() req: Express.Request, @Body() dto: GetPostsByIdsDto) {
    return this.postClient.getPostsByIds(dto.postIds, req.user.userId);
  }

  @Post(':postId/view')
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(200, 60, { key: RateLimitKeyType.IP_USER_ID })
  @ApiBearerAuth()
  incrementView(@Param('postId') postId: string, @Req() req: Express.Request) {
    return this.postClient.incrementView(postId, req.user.userId);
  }
}
