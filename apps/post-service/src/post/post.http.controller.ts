import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { PostService } from './post.service';
import { CreatePostDto } from '@app/common/dto/post/create-post.dto';
import { UpdatePostDto } from '@app/common/dto/post/update-post.dto';
import { SharePostDto } from '@app/common/dto/post/share-post.dto';
import { AddCommentDto } from '@app/common/dto/post/add-comment.dto';
import { GetPostsByIdsDto } from '@app/common/dto/post/get-posts-by-ids.dto';

@ApiTags('Posts')
@Controller('posts')
export class PostHttpController {
  constructor(private readonly postService: PostService) {}

  @Post()
  @ApiOperation({
    summary: 'Create Post',
  })
  @ApiQuery({
    name: 'userId',
    type: String,
    required: true,
    description: 'Temporary. Later it will come from JWT.',
  })
  @ApiBody({
    type: CreatePostDto,
  })
  createPost(@Query('userId') userId: string, @Body() dto: CreatePostDto) {
    return this.postService.createPost({
      userId,
      ...dto,
    });
  }

  @Get(':postId')
  @ApiOperation({
    summary: 'Get Post',
  })
  @ApiParam({
    name: 'postId',
  })
  @ApiQuery({
    name: 'requesterId',
    required: true,
  })
  getPost(
    @Param('postId') postId: string,
    @Query('requesterId') requesterId: string,
  ) {
    return this.postService.getPost(postId, requesterId);
  }

  @Patch(':postId')
  @ApiOperation({
    summary: 'Update Post',
  })
  @ApiParam({
    name: 'postId',
  })
  @ApiQuery({
    name: 'userId',
    required: true,
  })
  @ApiBody({
    type: UpdatePostDto,
  })
  updatePost(
    @Param('postId') postId: string,
    @Query('userId') userId: string,
    @Body() dto: UpdatePostDto,
  ) {
    return this.postService.updatePost(postId, userId, dto);
  }

  @Delete(':postId')
  @ApiOperation({
    summary: 'Delete Post',
  })
  @ApiParam({
    name: 'postId',
  })
  @ApiQuery({
    name: 'userId',
    required: true,
  })
  deletePost(@Param('postId') postId: string, @Query('userId') userId: string) {
    return this.postService.deletePost(postId, userId);
  }

  @Get('/user/:userId')
  @ApiOperation({
    summary: 'Get User Posts',
  })
  @ApiParam({
    name: 'userId',
  })
  @ApiQuery({
    name: 'requesterId',
    required: true,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 10,
  })
  getUserPosts(
    @Param('userId') userId: string,
    @Query('requesterId') requesterId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.postService.getUserPosts(
      userId,
      requesterId,
      Number(page),
      Number(limit),
    );
  }

  @Post(':postId/like')
  @ApiOperation({
    summary: 'Like Post',
  })
  @ApiParam({
    name: 'postId',
  })
  @ApiQuery({
    name: 'userId',
    required: true,
  })
  likePost(@Param('postId') postId: string, @Query('userId') userId: string) {
    return this.postService.likePost(postId, userId);
  }

  @Delete(':postId/like')
  @ApiOperation({
    summary: 'Unlike Post',
  })
  @ApiParam({
    name: 'postId',
  })
  @ApiQuery({
    name: 'userId',
    required: true,
  })
  unlikePost(@Param('postId') postId: string, @Query('userId') userId: string) {
    return this.postService.unlikePost(postId, userId);
  }

  @Post(':postId/bookmark')
  @ApiOperation({
    summary: 'Bookmark / Unbookmark Post',
  })
  @ApiParam({
    name: 'postId',
  })
  @ApiQuery({
    name: 'userId',
    required: true,
  })
  bookmarkPost(
    @Param('postId') postId: string,
    @Query('userId') userId: string,
  ) {
    return this.postService.bookmarkPost(postId, userId);
  }

  @Post(':postId/share')
  @ApiOperation({
    summary: 'Share Post',
  })
  @ApiParam({
    name: 'postId',
  })
  @ApiQuery({
    name: 'userId',
    required: true,
  })
  @ApiBody({
    type: SharePostDto,
  })
  sharePost(
    @Param('postId') postId: string,
    @Query('userId') userId: string,
    @Body() dto: SharePostDto,
  ) {
    return this.postService.sharePost(postId, userId, dto.comment);
  }

  // ---------------------------------------------------------
  // Add Comment
  // ---------------------------------------------------------

  @Post(':postId/comments')
  @ApiOperation({
    summary: 'Add Comment',
  })
  @ApiParam({
    name: 'postId',
  })
  @ApiQuery({
    name: 'userId',
    required: true,
  })
  @ApiBody({
    type: AddCommentDto,
  })
  addComment(
    @Param('postId') postId: string,
    @Query('userId') userId: string,
    @Body() dto: AddCommentDto,
  ) {
    return this.postService.addComment({
      postId,
      userId,
      text: dto.text,
      parentId: dto.parentId,
    });
  }

  @Get(':postId/comments')
  @ApiOperation({
    summary: 'Get Comments',
  })
  @ApiParam({
    name: 'postId',
  })
  @ApiQuery({
    name: 'parentId',
    required: false,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 10,
  })
  getComments(
    @Param('postId') postId: string,
    @Query('parentId') parentId?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.postService.getComments(
      postId,
      parentId ?? null,
      Number(page),
      Number(limit),
    );
  }

  @Post('by-ids')
  @ApiOperation({
    summary: 'Get Posts By IDs',
  })
  @ApiQuery({
    name: 'requesterId',
    required: true,
  })
  @ApiBody({
    type: GetPostsByIdsDto,
  })
  getPostsByIds(
    @Body() dto: GetPostsByIdsDto,
    @Query('requesterId') requesterId: string,
  ) {
    return this.postService.getPostsByIds(dto.postIds, requesterId);
  }

  @Post('flush-counts')
  @ApiOperation({
    summary: 'Flush Redis counts to database',
  })
  flushCounts() {
    return this.postService.flushCountsToDB();
  }
}
