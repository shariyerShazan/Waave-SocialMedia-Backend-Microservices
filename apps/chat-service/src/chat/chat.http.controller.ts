/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { ChatService } from './chat.service';
import {
  PaginationDto,
  StartConversationDto,
  CreateGroupDto,
  AddGroupMemberDto,
  SendMessageDto,
  ReactMessageDto,
} from '@app/common';

@ApiTags('Chat')
@Controller('chat')
export class ChatHttpController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  @ApiOperation({
    summary: 'Get conversation list',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 20,
  })
  @ApiOkResponse({
    description: 'Conversations fetched successfully.',
  })
  getConversations(@Body() body: any, @Query() query: PaginationDto) {
    return this.chatService.getConversations(
      body.userId,
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
  getMessages(
    @Param('conversationId') conversationId: string,
    @Body() body: any,
    @Query() query: PaginationDto,
  ) {
    return this.chatService.getMessages(
      conversationId,
      body.userId,
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
  getOrCreateConversation(@Body() body: any) {
    return this.chatService.getOrCreateConversation(
      body.userId,
      body.targetUserId,
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
  createGroup(@Body() body: any) {
    return this.chatService.createGroup({
      name: body.name,
      creatorId: body.userId,
      participantIds: body.participantIds,
      avatar: body.avatar,
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
  addGroupMember(
    @Param('conversationId') conversationId: string,
    @Body() body: any,
  ) {
    return this.chatService.addGroupMember(
      conversationId,
      body.userId,
      body.userIdToAdd, // or targetUserId if you prefer
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
  sendMessage(@Body() body: any) {
    return this.chatService.sendMessage({
      conversationId: body.conversationId,
      senderId: body.userId,
      senderName: '',
      senderAvatar: '',
      text: body.text,
      mediaIds: body.mediaIds,
      type: body.type,
      replyTo: body.replyTo,
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
  reactToMessage(@Param('messageId') messageId: string, @Body() body: any) {
    return this.chatService.reactToMessage(messageId, body.userId, body.emoji);
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
  markAsRead(
    @Param('conversationId') conversationId: string,
    @Body() body: any,
  ) {
    return this.chatService.markAsRead(conversationId, body.userId);
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
  deleteMessage(@Param('messageId') messageId: string, @Body() body: any) {
    return this.chatService.deleteMessage(messageId, body.userId);
  }
}
