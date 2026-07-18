import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import * as Express from 'express';

import { AuthGuard } from '@app/common';

import { ChatClient } from './chat.client';
import { RateLimitGuard } from '../rateLimit/guard/rate-limit.guard';
import {
  RateLimit,
  RateLimitKeyType,
} from '../rateLimit/decorator/rate-limit.decorator';
import {
  PaginationDto,
  StartConversationDto,
  CreateGroupDto,
  AddGroupMemberDto,
  SendMessageDto,
  ReactMessageDto,
} from '@app/common';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('chat')
@UseGuards(AuthGuard, RateLimitGuard)
export class ChatController {
  constructor(private readonly chatClient: ChatClient) {}

  @Get('conversations')
  @ApiOperation({
    summary: 'Get user conversations',
    description: 'Returns paginated conversations of the authenticated user.',
  })
  @ApiOkResponse({
    description: 'Conversations fetched successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized.',
  })
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  getConversations(@Req() req: Express.Request, @Query() query: PaginationDto) {
    return this.chatClient.getConversations(
      req.user.userId,
      Number(query.page ?? 1),
      Number(query.limit ?? 20),
    );
  }

  @Get('conversations/:conversationId/messages')
  @ApiOperation({
    summary: 'Get conversation messages',
  })
  @ApiParam({
    name: 'conversationId',
    example: '68844a7d8a4f7b0cb3ab1234',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 50,
  })
  @ApiOkResponse({
    description: 'Messages fetched successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized.',
  })
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  getMessages(
    @Req() req: Express.Request,
    @Param('conversationId') conversationId: string,
    @Query() query: PaginationDto,
  ) {
    return this.chatClient.getMessages(
      conversationId,
      req.user.userId,
      Number(query.page ?? 1),
      Number(query.limit ?? 50),
    );
  }

  @Post('conversations')
  @ApiOperation({
    summary: 'Start or get direct conversation',
  })
  @ApiBody({
    type: StartConversationDto,
  })
  @ApiCreatedResponse({
    description: 'Conversation returned successfully.',
  })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  getOrCreateConversation(
    @Req() req: Express.Request,
    @Body() dto: StartConversationDto,
  ) {
    return this.chatClient.getOrCreateConversation(
      req.user.userId,
      dto.targetUserId,
    );
  }

  @Post('groups')
  @ApiOperation({
    summary: 'Create a group conversation',
  })
  @ApiBody({
    type: CreateGroupDto,
  })
  @ApiCreatedResponse({
    description: 'Group created successfully.',
  })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @RateLimit(30, 60, { key: RateLimitKeyType.IP_USER_ID })
  createGroup(@Req() req: Express.Request, @Body() dto: CreateGroupDto) {
    return this.chatClient.createGroup({
      name: dto.name,
      creatorId: req.user.userId,
      participantIds: dto.participantIds,
      avatar: dto.avatar,
    });
  }

  @Post('groups/:conversationId/members')
  @ApiOperation({
    summary: 'Add member to group',
  })
  @ApiParam({
    name: 'conversationId',
    example: '68844a7d8a4f7b0cb3ab1234',
  })
  @ApiBody({
    type: AddGroupMemberDto,
  })
  @ApiOkResponse({
    description: 'Member added successfully.',
  })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @RateLimit(30, 60, { key: RateLimitKeyType.IP_USER_ID })
  addGroupMember(
    @Req() req: Express.Request,
    @Param('conversationId') conversationId: string,
    @Body() dto: AddGroupMemberDto,
  ) {
    return this.chatClient.addGroupMember(
      conversationId,
      req.user.userId,
      dto.userId,
    );
  }

  @Post('messages')
  @ApiOperation({
    summary: 'Send a message',
  })
  @ApiBody({
    type: SendMessageDto,
  })
  @ApiCreatedResponse({
    description: 'Message sent successfully.',
  })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @RateLimit(120, 60, { key: RateLimitKeyType.IP_USER_ID })
  sendMessage(@Req() req: Express.Request, @Body() dto: SendMessageDto) {
    return this.chatClient.sendMessage({
      conversationId: dto.conversationId,
      senderId: req.user.userId,

      senderName: '',
      senderAvatar: '',

      text: dto.text,
      mediaIds: dto.mediaIds,
      type: dto.type,
      replyTo: dto.replyTo,
    });
  }

  @Post('messages/:messageId/react')
  @ApiOperation({
    summary: 'React to a message',
  })
  @ApiParam({
    name: 'messageId',
    example: '68844a7d8a4f7b0cb3ab5678',
  })
  @ApiBody({
    type: ReactMessageDto,
  })
  @ApiOkResponse({
    description: 'Reaction updated successfully.',
  })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @RateLimit(120, 60, { key: RateLimitKeyType.IP_USER_ID })
  reactToMessage(
    @Req() req: Express.Request,
    @Param('messageId') messageId: string,
    @Body() dto: ReactMessageDto,
  ) {
    return this.chatClient.reactToMessage(
      messageId,
      req.user.userId,
      dto.emoji,
    );
  }

  @Post('conversations/:conversationId/read')
  @ApiOperation({
    summary: 'Mark conversation as read',
  })
  @ApiParam({
    name: 'conversationId',
    example: '68844a7d8a4f7b0cb3ab1234',
  })
  @ApiOkResponse({
    description: 'Conversation marked as read.',
  })
  @ApiUnauthorizedResponse()
  @RateLimit(120, 60, { key: RateLimitKeyType.IP_USER_ID })
  markAsRead(
    @Req() req: Express.Request,
    @Param('conversationId') conversationId: string,
  ) {
    return this.chatClient.markAsRead(conversationId, req.user.userId);
  }

  @Delete('messages/:messageId')
  @ApiOperation({
    summary: 'Delete a message',
  })
  @ApiParam({
    name: 'messageId',
    example: '68844a7d8a4f7b0cb3ab5678',
  })
  @ApiOkResponse({
    description: 'Message deleted successfully.',
  })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  deleteMessage(
    @Req() req: Express.Request,
    @Param('messageId') messageId: string,
  ) {
    return this.chatClient.deleteMessage(messageId, req.user.userId);
  }
}
