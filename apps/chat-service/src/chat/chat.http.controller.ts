/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
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
  AddGroupMemberDto,
  ArchiveConversationDto,
  ChatPaginationDto,
  CreateGroupDto,
  EditMessageDto,
  ForwardMessageDto,
  MarkConversationReadDto,
  MarkReceiptDto,
  MuteConversationDto,
  PaginationDto,
  PinConversationDto,
  PinMessageDto,
  ReactMessageDto,
  SendMessageDto,
  StartConversationDto,
  UpdateMemberRoleDto,
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
  @ApiQuery({
    name: 'archived',
    required: false,
  })
  @ApiOkResponse({
    description: 'Conversations fetched successfully.',
  })
  getConversations(
    @Body() body: any,
    @Query() query: PaginationDto,
    @Query('archived') archived?: string,
  ) {
    return this.chatService.getConversations(
      body.userId,
      Number(query.page ?? 1),
      Number(query.limit ?? 20),
      archived === 'true' ? true : archived === 'false' ? false : undefined,
    );
  }

  @Get('conversations/:conversationId')
  @ApiOperation({
    summary: 'Get single conversation',
  })
  @ApiParam({
    name: 'conversationId',
  })
  getConversation(
    @Param('conversationId') conversationId: string,
    @Body() body: any,
  ) {
    return this.chatService.getConversation(conversationId, body.userId);
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
    @Query() query: ChatPaginationDto,
  ) {
    return this.chatService.getMessages(
      conversationId,
      body.userId,
      Number(query.page ?? 1),
      Number(query.limit ?? 50),
      query.beforeMessageId,
      query.afterMessageId,
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
      body.userIdToAdd || body.userId,
      body.role,
    );
  }

  @Delete('groups/:conversationId/members/:targetUserId')
  @ApiOperation({ summary: 'Remove member from group' })
  removeGroupMember(
    @Param('conversationId') conversationId: string,
    @Param('targetUserId') targetUserId: string,
    @Body() body: any,
  ) {
    return this.chatService.removeGroupMember(
      conversationId,
      body.userId,
      targetUserId,
    );
  }

  @Post('groups/:conversationId/leave')
  @ApiOperation({ summary: 'Leave group' })
  leaveGroup(
    @Param('conversationId') conversationId: string,
    @Body() body: any,
  ) {
    return this.chatService.leaveGroup(conversationId, body.userId);
  }

  @Patch('groups/:conversationId/members/:targetUserId/role')
  @ApiOperation({ summary: 'Update group member role' })
  @ApiBody({ type: UpdateMemberRoleDto })
  updateMemberRole(
    @Param('conversationId') conversationId: string,
    @Param('targetUserId') targetUserId: string,
    @Body() body: any,
  ) {
    return this.chatService.updateMemberRole(
      conversationId,
      body.userId,
      targetUserId,
      body.role,
    );
  }

  @Patch('conversations/:conversationId/mute')
  @ApiOperation({ summary: 'Mute/unmute conversation' })
  @ApiBody({ type: MuteConversationDto })
  muteConversation(
    @Param('conversationId') conversationId: string,
    @Body() body: any,
  ) {
    return this.chatService.muteConversation(
      conversationId,
      body.userId,
      body.muted,
      body.mutedUntil,
    );
  }

  @Patch('conversations/:conversationId/archive')
  @ApiOperation({ summary: 'Archive/unarchive conversation' })
  @ApiBody({ type: ArchiveConversationDto })
  archiveConversation(
    @Param('conversationId') conversationId: string,
    @Body() body: any,
  ) {
    return this.chatService.archiveConversation(
      conversationId,
      body.userId,
      body.archived,
    );
  }

  @Patch('conversations/:conversationId/pin')
  @ApiOperation({ summary: 'Pin/unpin conversation' })
  @ApiBody({ type: PinConversationDto })
  pinConversation(
    @Param('conversationId') conversationId: string,
    @Body() body: any,
  ) {
    return this.chatService.pinConversation(
      conversationId,
      body.userId,
      body.pinned,
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
      senderName: body.senderName || '',
      senderAvatar: body.senderAvatar || '',
      text: body.text,
      mediaIds: body.mediaIds,
      type: body.type,
      replyTo: body.replyTo,
      forwardedFromMessageId: body.forwardedFromMessageId,
      clientMessageId: body.clientMessageId,
    });
  }

  @Patch('messages/:messageId')
  @ApiOperation({ summary: 'Edit message' })
  @ApiBody({ type: EditMessageDto })
  editMessage(@Param('messageId') messageId: string, @Body() body: any) {
    return this.chatService.editMessage(messageId, body.userId, body.text);
  }

  @Delete('messages/:messageId')
  @ApiOperation({
    summary: 'Delete a message',
  })
  @ApiParam({
    name: 'messageId',
    example: '68844a7d8a4f7b0cb3ab5678',
  })
  @ApiQuery({ name: 'forEveryone', required: false })
  @ApiOkResponse({
    description: 'Message deleted successfully.',
  })
  @ApiBadRequestResponse()
  deleteMessage(
    @Param('messageId') messageId: string,
    @Body() body: any,
    @Query('forEveryone') forEveryone?: string,
  ) {
    return this.chatService.deleteMessage(
      messageId,
      body.userId,
      forEveryone === 'true',
    );
  }

  @Post('messages/forward')
  @ApiOperation({ summary: 'Forward message' })
  @ApiBody({ type: ForwardMessageDto })
  forwardMessage(@Body() body: any) {
    return this.chatService.forwardMessage({
      sourceMessageId: body.sourceMessageId,
      targetConversationId: body.targetConversationId,
      senderId: body.userId,
    });
  }

  @Post('receipts')
  @ApiOperation({ summary: 'Mark message receipt' })
  @ApiBody({ type: MarkReceiptDto })
  markReceipt(@Body() body: any) {
    return this.chatService.markReceipt(
      body.messageId,
      body.userId,
      body.status,
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
  @ApiBody({ type: MarkConversationReadDto })
  @ApiOkResponse({
    description: 'Conversation marked as read.',
  })
  markAsRead(
    @Param('conversationId') conversationId: string,
    @Body() body: any,
  ) {
    return this.chatService.markAsRead(
      conversationId,
      body.userId,
      body.upToMessageId,
    );
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

  @Patch('conversations/:conversationId/messages/:messageId/pin')
  @ApiOperation({ summary: 'Pin/unpin message in conversation' })
  @ApiBody({ type: PinMessageDto })
  pinMessage(
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
    @Body() body: any,
  ) {
    return this.chatService.pinMessage(
      conversationId,
      messageId,
      body.userId,
      body.pinned,
    );
  }

  @Get('unread')
  @ApiOperation({ summary: 'Get unread counts across conversations' })
  getUnreadCounts(@Body() body: any) {
    return this.chatService.getUnreadCounts(body.userId);
  }

  @Get('groups/:conversationId/members/notification')
  @ApiOperation({ summary: 'Get group members for notification' })
  getGroupMembersForNotif(@Param('conversationId') conversationId: string) {
    return this.chatService.getGroupMembersForNotif(conversationId);
  }
}
