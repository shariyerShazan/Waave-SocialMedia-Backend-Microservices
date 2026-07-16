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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import * as Express from 'express';

import { AuthGuard } from '@app/common';

import { ChatClient } from './chat.client';
import { RateLimitGuard } from '../rateLimit/guard/rate-limit.guard';
import {
  RateLimit,
  RateLimitKeyType,
} from '../rateLimit/decorator/rate-limit.decorator';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('chat')
@UseGuards(AuthGuard, RateLimitGuard)
export class ChatController {
  constructor(private readonly chatClient: ChatClient) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Get conversations' })
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  getConversations(
    @Req() req: Express.Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatClient.getConversations(
      req.user.userId,
      Number(page || 1),
      Number(limit || 20),
    );
  }

  @Get('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Get messages' })
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  getMessages(
    @Req() req: Express.Request,
    @Param('conversationId') conversationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatClient.getMessages(
      conversationId,
      req.user.userId,
      Number(page || 1),
      Number(limit || 50),
    );
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Get or create direct conversation' })
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  getOrCreateConversation(
    @Req() req: Express.Request,
    @Body() dto: { targetUserId: string },
  ) {
    return this.chatClient.getOrCreateConversation(
      req.user.userId,
      dto.targetUserId,
    );
  }

  @Post('groups')
  @ApiOperation({ summary: 'Create group' })
  @RateLimit(30, 60, { key: RateLimitKeyType.IP_USER_ID })
  createGroup(
    @Req() req: Express.Request,
    @Body()
    dto: {
      name: string;
      participantIds: string[];
      avatar?: string;
    },
  ) {
    return this.chatClient.createGroup({
      name: dto.name,
      creatorId: req.user.userId,
      participantIds: dto.participantIds,
      avatar: dto.avatar,
    });
  }

  @Post('groups/:conversationId/members')
  @ApiOperation({ summary: 'Add group member' })
  @RateLimit(30, 60, { key: RateLimitKeyType.IP_USER_ID })
  addGroupMember(
    @Req() req: Express.Request,
    @Param('conversationId') conversationId: string,
    @Body() dto: { userId: string },
  ) {
    return this.chatClient.addGroupMember(
      conversationId,
      req.user.userId,
      dto.userId,
    );
  }

  @Post('messages')
  @ApiOperation({ summary: 'Send message' })
  @RateLimit(120, 60, { key: RateLimitKeyType.IP_USER_ID })
  sendMessage(
    @Req() req: Express.Request,
    @Body()
    dto: {
      conversationId: string;
      senderName: string;
      senderAvatar?: string;
      text: string;
      mediaIds?: string[];
      type?: string;
      replyTo?: string;
    },
  ) {
    return this.chatClient.sendMessage({
      conversationId: dto.conversationId,
      senderId: req.user.userId,
      senderName: dto.senderName,
      senderAvatar: dto.senderAvatar,
      text: dto.text,
      mediaIds: dto.mediaIds,
      type: dto.type,
      replyTo: dto.replyTo,
    });
  }

  @Post('messages/:messageId/react')
  @ApiOperation({ summary: 'React to message' })
  @RateLimit(120, 60, { key: RateLimitKeyType.IP_USER_ID })
  reactToMessage(
    @Req() req: Express.Request,
    @Param('messageId') messageId: string,
    @Body() dto: { emoji: string },
  ) {
    return this.chatClient.reactToMessage(
      messageId,
      req.user.userId,
      dto.emoji,
    );
  }

  @Post('conversations/:conversationId/read')
  @ApiOperation({ summary: 'Mark conversation as read' })
  @RateLimit(120, 60, { key: RateLimitKeyType.IP_USER_ID })
  markAsRead(
    @Req() req: Express.Request,
    @Param('conversationId') conversationId: string,
  ) {
    return this.chatClient.markAsRead(conversationId, req.user.userId);
  }

  @Delete('messages/:messageId')
  @ApiOperation({ summary: 'Delete message' })
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  deleteMessage(
    @Req() req: Express.Request,
    @Param('messageId') messageId: string,
  ) {
    return this.chatClient.deleteMessage(messageId, req.user.userId);
  }
}
