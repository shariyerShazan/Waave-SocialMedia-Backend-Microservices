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
import { RateLimitGuard } from '../rateLimit/guard/rate-limit.guard';
import {
  RateLimit,
  RateLimitKeyType,
} from '../rateLimit/decorator/rate-limit.decorator';
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
  PinConversationDto,
  PinMessageDto,
  ReactMessageDto,
  SendMessageDto,
  StartConversationDto,
  UpdateMemberRoleDto,
} from '@app/common';
import { ChatGrpcClient } from 'libs/grpc-clients/src';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('chat')
@UseGuards(AuthGuard, RateLimitGuard)
export class ChatController {
  constructor(private readonly chatClient: ChatGrpcClient) {}

  @Get('conversations')
  @ApiOperation({
    summary: 'Get user conversations',
    description: 'Returns paginated conversations of the authenticated user.',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'archived', required: false, example: false })
  @ApiOkResponse({ description: 'Conversations fetched successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized.' })
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  getConversations(
    @Req() req: Express.Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('archived') archived?: string,
  ) {
    return this.chatClient.getConversations({
      userId: req.user.userId,
      page: Number(page ?? 1),
      limit: Number(limit ?? 20),
      archived:
        archived === 'true' ? true : archived === 'false' ? false : undefined,
    });
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get conversation by id' })
  @ApiParam({ name: 'id', example: '68844a7d8a4f7b0cb3ab1234' })
  @ApiOkResponse({ description: 'Conversation fetched successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized.' })
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  getConversation(@Req() req: Express.Request, @Param('id') id: string) {
    return this.chatClient.getConversation({
      conversationId: id,
      userId: req.user.userId,
    });
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Start or get direct conversation' })
  @ApiBody({ type: StartConversationDto })
  @ApiCreatedResponse({ description: 'Conversation returned successfully.' })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  getOrCreateConversation(
    @Req() req: Express.Request,
    @Body() dto: StartConversationDto,
  ) {
    return this.chatClient.getOrCreateConversation({
      userId1: req.user.userId,
      userId2: dto.targetUserId,
    });
  }

  @Post('groups')
  @ApiOperation({ summary: 'Create a group conversation' })
  @ApiBody({ type: CreateGroupDto })
  @ApiCreatedResponse({ description: 'Group created successfully.' })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @RateLimit(30, 60, { key: RateLimitKeyType.IP_USER_ID })
  createGroup(@Req() req: Express.Request, @Body() dto: CreateGroupDto) {
    return this.chatClient.createGroup({
      name: dto.name,
      creatorId: req.user.userId,
      participantIds: dto.participantIds,
      avatar: dto.avatar ?? '',
    });
  }

  @Post('groups/:id/members')
  @ApiOperation({ summary: 'Add member to group' })
  @ApiParam({ name: 'id', example: '68844a7d8a4f7b0cb3ab1234' })
  @ApiBody({ type: AddGroupMemberDto })
  @ApiOkResponse({ description: 'Member added successfully.' })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @RateLimit(30, 60, { key: RateLimitKeyType.IP_USER_ID })
  addGroupMember(
    @Req() req: Express.Request,
    @Param('id') id: string,
    @Body() dto: AddGroupMemberDto,
  ) {
    return this.chatClient.addGroupMember({
      conversationId: id,
      adminId: req.user.userId,
      userId: dto.userId,
      role: dto.role,
    });
  }

  @Delete('groups/:id/members/:userId')
  @ApiOperation({ summary: 'Remove member from group' })
  @ApiParam({ name: 'id', example: '68844a7d8a4f7b0cb3ab1234' })
  @ApiParam({ name: 'userId', example: '68844a7d8a4f7b0cb3ab5678' })
  @ApiOkResponse({ description: 'Member removed successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized.' })
  @RateLimit(30, 60, { key: RateLimitKeyType.IP_USER_ID })
  removeGroupMember(
    @Req() req: Express.Request,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.chatClient.removeGroupMember({
      conversationId: id,
      adminId: req.user.userId,
      userId,
    });
  }

  @Post('groups/:id/leave')
  @ApiOperation({ summary: 'Leave group' })
  @ApiParam({ name: 'id', example: '68844a7d8a4f7b0cb3ab1234' })
  @ApiOkResponse({ description: 'Left group successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized.' })
  @RateLimit(30, 60, { key: RateLimitKeyType.IP_USER_ID })
  leaveGroup(@Req() req: Express.Request, @Param('id') id: string) {
    return this.chatClient.leaveGroup({
      conversationId: id,
      userId: req.user.userId,
    });
  }

  @Patch('groups/:id/members/:userId/role')
  @ApiOperation({ summary: 'Update group member role' })
  @ApiParam({ name: 'id', example: '68844a7d8a4f7b0cb3ab1234' })
  @ApiParam({ name: 'userId', example: '68844a7d8a4f7b0cb3ab5678' })
  @ApiBody({ type: UpdateMemberRoleDto })
  @ApiOkResponse({ description: 'Member role updated successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized.' })
  @RateLimit(30, 60, { key: RateLimitKeyType.IP_USER_ID })
  updateMemberRole(
    @Req() req: Express.Request,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.chatClient.updateMemberRole({
      conversationId: id,
      adminId: req.user.userId,
      userId,
      role: dto.role,
    });
  }

  @Post('conversations/:id/mute')
  @ApiOperation({ summary: 'Mute or unmute conversation' })
  @ApiParam({ name: 'id', example: '68844a7d8a4f7b0cb3ab1234' })
  @ApiBody({ type: MuteConversationDto })
  @ApiOkResponse({ description: 'Conversation mute updated.' })
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  muteConversation(
    @Req() req: Express.Request,
    @Param('id') id: string,
    @Body() dto: MuteConversationDto,
  ) {
    return this.chatClient.muteConversation({
      conversationId: id,
      userId: req.user.userId,
      muted: dto.muted,
      mutedUntil: dto.mutedUntil,
    });
  }

  @Post('conversations/:id/archive')
  @ApiOperation({ summary: 'Archive or unarchive conversation' })
  @ApiParam({ name: 'id', example: '68844a7d8a4f7b0cb3ab1234' })
  @ApiBody({ type: ArchiveConversationDto })
  @ApiOkResponse({ description: 'Conversation archive updated.' })
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  archiveConversation(
    @Req() req: Express.Request,
    @Param('id') id: string,
    @Body() dto: ArchiveConversationDto,
  ) {
    return this.chatClient.archiveConversation({
      conversationId: id,
      userId: req.user.userId,
      archived: dto.archived,
    });
  }

  @Post('conversations/:id/pin')
  @ApiOperation({ summary: 'Pin or unpin conversation' })
  @ApiParam({ name: 'id', example: '68844a7d8a4f7b0cb3ab1234' })
  @ApiBody({ type: PinConversationDto })
  @ApiOkResponse({ description: 'Conversation pin updated.' })
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  pinConversation(
    @Req() req: Express.Request,
    @Param('id') id: string,
    @Body() dto: PinConversationDto,
  ) {
    return this.chatClient.pinConversation({
      conversationId: id,
      userId: req.user.userId,
      pinned: dto.pinned,
    });
  }

  @Post('messages')
  @ApiOperation({ summary: 'Send a message' })
  @ApiBody({ type: SendMessageDto })
  @ApiCreatedResponse({ description: 'Message sent successfully.' })
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
      forwardedFromMessageId: dto.forwardedFromMessageId,
      clientMessageId: dto.clientMessageId,
    });
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get conversation messages' })
  @ApiParam({ name: 'id', example: '68844a7d8a4f7b0cb3ab1234' })
  @ApiOkResponse({ description: 'Messages fetched successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized.' })
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  getMessages(
    @Req() req: Express.Request,
    @Param('id') id: string,
    @Query() query: ChatPaginationDto,
  ) {
    return this.chatClient.getMessages({
      conversationId: id,
      userId: req.user.userId,
      page: Number(query.page ?? 1),
      limit: Number(query.limit ?? 50),
      beforeMessageId: query.beforeMessageId,
      afterMessageId: query.afterMessageId,
    });
  }

  @Patch('messages/:id')
  @ApiOperation({ summary: 'Edit message' })
  @ApiParam({ name: 'id', example: '68844a7d8a4f7b0cb3ab5678' })
  @ApiBody({ type: EditMessageDto })
  @ApiOkResponse({ description: 'Message edited successfully.' })
  @RateLimit(120, 60, { key: RateLimitKeyType.IP_USER_ID })
  editMessage(
    @Req() req: Express.Request,
    @Param('id') id: string,
    @Body() dto: EditMessageDto,
  ) {
    return this.chatClient.editMessage({
      messageId: id,
      senderId: req.user.userId,
      text: dto.text,
    });
  }

  @Delete('messages/:id')
  @ApiOperation({ summary: 'Delete a message' })
  @ApiParam({ name: 'id', example: '68844a7d8a4f7b0cb3ab5678' })
  @ApiQuery({ name: 'forEveryone', required: false, example: false })
  @ApiOkResponse({ description: 'Message deleted successfully.' })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  deleteMessage(
    @Req() req: Express.Request,
    @Param('id') id: string,
    @Query('forEveryone') forEveryone?: string,
  ) {
    return this.chatClient.deleteMessage({
      messageId: id,
      userId: req.user.userId,
      forEveryone: forEveryone === 'true',
    });
  }

  @Post('messages/:id/forward')
  @ApiOperation({ summary: 'Forward message' })
  @ApiParam({ name: 'id', example: '68844a7d8a4f7b0cb3ab5678' })
  @ApiBody({ type: ForwardMessageDto })
  @ApiCreatedResponse({ description: 'Message forwarded successfully.' })
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  forwardMessage(
    @Req() req: Express.Request,
    @Param('id') id: string,
    @Body() dto: ForwardMessageDto,
  ) {
    return this.chatClient.forwardMessage({
      sourceMessageId: id,
      targetConversationId: dto.targetConversationId,
      senderId: req.user.userId,
    });
  }

  @Post('messages/:id/receipt')
  @ApiOperation({ summary: 'Mark message receipt' })
  @ApiParam({ name: 'id', example: '68844a7d8a4f7b0cb3ab5678' })
  @ApiBody({ type: MarkReceiptDto })
  @ApiOkResponse({ description: 'Receipt marked successfully.' })
  @RateLimit(120, 60, { key: RateLimitKeyType.IP_USER_ID })
  markReceipt(
    @Req() req: Express.Request,
    @Param('id') id: string,
    @Body() dto: MarkReceiptDto,
  ) {
    return this.chatClient.markReceipt({
      messageId: id,
      userId: req.user.userId,
      status: dto.status,
    });
  }

  @Post('conversations/:id/read')
  @ApiOperation({ summary: 'Mark conversation as read' })
  @ApiParam({ name: 'id', example: '68844a7d8a4f7b0cb3ab1234' })
  @ApiBody({ type: MarkConversationReadDto })
  @ApiOkResponse({ description: 'Conversation marked as read.' })
  @ApiUnauthorizedResponse()
  @RateLimit(120, 60, { key: RateLimitKeyType.IP_USER_ID })
  markAsRead(
    @Req() req: Express.Request,
    @Param('id') id: string,
    @Body() dto: MarkConversationReadDto,
  ) {
    return this.chatClient.markAsRead({
      conversationId: id,
      userId: req.user.userId,
      upToMessageId: dto.upToMessageId,
    });
  }

  @Post('messages/:id/react')
  @ApiOperation({ summary: 'React to a message' })
  @ApiParam({ name: 'id', example: '68844a7d8a4f7b0cb3ab5678' })
  @ApiBody({ type: ReactMessageDto })
  @ApiOkResponse({ description: 'Reaction updated successfully.' })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @RateLimit(120, 60, { key: RateLimitKeyType.IP_USER_ID })
  reactToMessage(
    @Req() req: Express.Request,
    @Param('id') id: string,
    @Body() dto: ReactMessageDto,
  ) {
    return this.chatClient.reactToMessage({
      messageId: id,
      userId: req.user.userId,
      emoji: dto.emoji,
    });
  }

  @Post('conversations/:id/messages/:messageId/pin')
  @ApiOperation({ summary: 'Pin or unpin message in conversation' })
  @ApiParam({ name: 'id', example: '68844a7d8a4f7b0cb3ab1234' })
  @ApiParam({ name: 'messageId', example: '68844a7d8a4f7b0cb3ab5678' })
  @ApiBody({ type: PinMessageDto })
  @ApiOkResponse({ description: 'Message pin updated.' })
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  pinMessage(
    @Req() req: Express.Request,
    @Param('id') id: string,
    @Param('messageId') messageId: string,
    @Body() dto: PinMessageDto,
  ) {
    return this.chatClient.pinMessage({
      conversationId: id,
      messageId,
      userId: req.user.userId,
      pinned: dto.pinned,
    });
  }

  @Get('unread')
  @ApiOperation({ summary: 'Get unread counts across user conversations' })
  @ApiOkResponse({ description: 'Unread counts fetched successfully.' })
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  getUnreadCounts(@Req() req: Express.Request) {
    return this.chatClient.getUnreadCounts({
      userId: req.user.userId,
    });
  }
}
