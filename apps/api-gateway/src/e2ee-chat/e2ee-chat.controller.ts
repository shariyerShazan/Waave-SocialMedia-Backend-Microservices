import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
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

import {
  AddE2eeGroupMemberDto,
  ArchiveConversationDto,
  AuthGuard,
  CreateE2eeGroupDto,
  EditE2eeMessageDto,
  E2eePaginationDto,
  ForwardMessageDto,
  MarkConversationReadDto,
  MarkE2eeReceiptDto,
  MuteConversationDto,
  PinConversationDto,
  PinMessageDto,
  ReactE2eeMessageDto,
  SendE2eeMessageDto,
  StartE2eeConversationDto,
  UpdateE2eeMemberRoleDto,
  UploadSenderKeyDto,
} from '@app/common';

import { RateLimitGuard } from '../rateLimit/guard/rate-limit.guard';
import {
  RateLimit,
  RateLimitKeyType,
} from '../rateLimit/decorator/rate-limit.decorator';
import { E2eeChatGrpcClient } from 'libs/grpc-clients/src';

@ApiTags('E2EE Chat')
@ApiBearerAuth()
@Controller('e2ee/chat')
@UseGuards(AuthGuard, RateLimitGuard)
export class E2eeChatController {
  constructor(private readonly e2eeChatClient: E2eeChatGrpcClient) {}

  private resolveDeviceId(
    req: Express.Request,
    ...candidates: (string | undefined)[]
  ): string {
    for (const value of candidates) {
      if (value) {
        return value;
      }
    }

    const header = req.headers['x-device-id'];
    if (typeof header === 'string' && header) {
      return header;
    }

    return req.user?.deviceId ?? '';
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get E2EE conversations' })
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
    return this.e2eeChatClient.getConversations({
      userId: req.user.userId,
      page: Number(page ?? 1),
      limit: Number(limit ?? 20),
      archived:
        archived === 'true' ? true : archived === 'false' ? false : undefined,
    });
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get E2EE conversation by id' })
  @ApiParam({ name: 'id', example: '68844a7d8a4f7b0cb3ab1234' })
  @ApiOkResponse({ description: 'Conversation fetched successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized.' })
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  getConversation(@Req() req: Express.Request, @Param('id') id: string) {
    return this.e2eeChatClient.getConversation({
      conversationId: id,
      userId: req.user.userId,
    });
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Start or get direct E2EE conversation' })
  @ApiBody({ type: StartE2eeConversationDto })
  @ApiCreatedResponse({ description: 'Conversation returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized.' })
  @RateLimit(30, 60, { key: RateLimitKeyType.IP_USER_ID })
  getOrCreateDirect(
    @Req() req: Express.Request,
    @Body() dto: StartE2eeConversationDto,
  ) {
    return this.e2eeChatClient.getOrCreateDirectConversation({
      userId: req.user.userId,
      targetUserId: dto.targetUserId,
    });
  }

  @Post('groups')
  @ApiOperation({ summary: 'Create E2EE group conversation' })
  @ApiBody({ type: CreateE2eeGroupDto })
  @ApiCreatedResponse({ description: 'Group created successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized.' })
  @RateLimit(30, 60, { key: RateLimitKeyType.IP_USER_ID })
  createGroup(@Req() req: Express.Request, @Body() dto: CreateE2eeGroupDto) {
    return this.e2eeChatClient.createGroup({
      name: dto.name,
      creatorId: req.user.userId,
      participantIds: dto.participantIds,
      avatar: dto.avatar ?? '',
    });
  }

  @Post('groups/:id/members')
  @ApiOperation({ summary: 'Add member to E2EE group' })
  @ApiParam({ name: 'id', example: '68844a7d8a4f7b0cb3ab1234' })
  @ApiBody({ type: AddE2eeGroupMemberDto })
  @ApiOkResponse({ description: 'Member added successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized.' })
  @RateLimit(30, 60, { key: RateLimitKeyType.IP_USER_ID })
  addGroupMember(
    @Req() req: Express.Request,
    @Param('id') id: string,
    @Body() dto: AddE2eeGroupMemberDto,
  ) {
    return this.e2eeChatClient.addGroupMember({
      conversationId: id,
      adminId: req.user.userId,
      userId: dto.userId,
      role: dto.role,
    });
  }

  @Delete('groups/:id/members/:userId')
  @ApiOperation({ summary: 'Remove member from E2EE group' })
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
    return this.e2eeChatClient.removeGroupMember({
      conversationId: id,
      adminId: req.user.userId,
      userId,
    });
  }

  @Post('groups/:id/leave')
  @ApiOperation({ summary: 'Leave E2EE group' })
  @ApiParam({ name: 'id', example: '68844a7d8a4f7b0cb3ab1234' })
  @ApiOkResponse({ description: 'Left group successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized.' })
  @RateLimit(30, 60, { key: RateLimitKeyType.IP_USER_ID })
  leaveGroup(@Req() req: Express.Request, @Param('id') id: string) {
    return this.e2eeChatClient.leaveGroup({
      conversationId: id,
      userId: req.user.userId,
    });
  }

  @Patch('groups/:id/members/:userId/role')
  @ApiOperation({ summary: 'Update E2EE group member role' })
  @ApiParam({ name: 'id', example: '68844a7d8a4f7b0cb3ab1234' })
  @ApiParam({ name: 'userId', example: '68844a7d8a4f7b0cb3ab5678' })
  @ApiBody({ type: UpdateE2eeMemberRoleDto })
  @ApiOkResponse({ description: 'Member role updated successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized.' })
  @RateLimit(30, 60, { key: RateLimitKeyType.IP_USER_ID })
  updateMemberRole(
    @Req() req: Express.Request,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateE2eeMemberRoleDto,
  ) {
    return this.e2eeChatClient.updateMemberRole({
      conversationId: id,
      adminId: req.user.userId,
      userId,
      role: dto.role,
    });
  }

  @Post('conversations/:id/mute')
  @ApiOperation({ summary: 'Mute or unmute E2EE conversation' })
  @ApiParam({ name: 'id', example: '68844a7d8a4f7b0cb3ab1234' })
  @ApiBody({ type: MuteConversationDto })
  @ApiOkResponse({ description: 'Conversation mute updated.' })
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  muteConversation(
    @Req() req: Express.Request,
    @Param('id') id: string,
    @Body() dto: MuteConversationDto,
  ) {
    return this.e2eeChatClient.muteConversation({
      conversationId: id,
      userId: req.user.userId,
      muted: dto.muted,
      mutedUntil: dto.mutedUntil,
    });
  }

  @Post('conversations/:id/archive')
  @ApiOperation({ summary: 'Archive or unarchive E2EE conversation' })
  @ApiParam({ name: 'id', example: '68844a7d8a4f7b0cb3ab1234' })
  @ApiBody({ type: ArchiveConversationDto })
  @ApiOkResponse({ description: 'Conversation archive updated.' })
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  archiveConversation(
    @Req() req: Express.Request,
    @Param('id') id: string,
    @Body() dto: ArchiveConversationDto,
  ) {
    return this.e2eeChatClient.archiveConversation({
      conversationId: id,
      userId: req.user.userId,
      archived: dto.archived,
    });
  }

  @Post('conversations/:id/pin')
  @ApiOperation({ summary: 'Pin or unpin E2EE conversation' })
  @ApiParam({ name: 'id', example: '68844a7d8a4f7b0cb3ab1234' })
  @ApiBody({ type: PinConversationDto })
  @ApiOkResponse({ description: 'Conversation pin updated.' })
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  pinConversation(
    @Req() req: Express.Request,
    @Param('id') id: string,
    @Body() dto: PinConversationDto,
  ) {
    return this.e2eeChatClient.pinConversation({
      conversationId: id,
      userId: req.user.userId,
      pinned: dto.pinned,
    });
  }

  @Post('messages')
  @ApiOperation({ summary: 'Send encrypted message' })
  @ApiBody({ type: SendE2eeMessageDto })
  @ApiCreatedResponse({ description: 'Message sent successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized.' })
  @RateLimit(120, 60, { key: RateLimitKeyType.IP_USER_ID })
  sendMessage(@Req() req: Express.Request, @Body() dto: SendE2eeMessageDto) {
    return this.e2eeChatClient.sendEncryptedMessage({
      conversationId: dto.conversationId,
      senderId: req.user.userId,
      senderDeviceId: this.resolveDeviceId(req, dto.senderDeviceId),
      type: dto.type,
      envelopes: dto.envelopes,
      attachments: dto.attachments ?? [],
      replyToMessageId: dto.replyToMessageId,
      forwardedFromMessageId: dto.forwardedFromMessageId,
      clientMessageId: dto.clientMessageId,
    });
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get encrypted messages' })
  @ApiParam({ name: 'id', example: '68844a7d8a4f7b0cb3ab1234' })
  @ApiQuery({ name: 'deviceId', required: false })
  @ApiOkResponse({ description: 'Messages fetched successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized.' })
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  getMessages(
    @Req() req: Express.Request,
    @Param('id') id: string,
    @Query() query: E2eePaginationDto,
    @Query('deviceId') deviceId?: string,
    @Headers('x-device-id') deviceHeader?: string,
  ) {
    return this.e2eeChatClient.getMessages({
      conversationId: id,
      userId: req.user.userId,
      deviceId: this.resolveDeviceId(req, deviceId, deviceHeader),
      page: Number(query.page ?? 1),
      limit: Number(query.limit ?? 50),
      beforeMessageId: query.beforeMessageId,
      afterMessageId: query.afterMessageId,
    });
  }

  @Get('pending-envelopes')
  @ApiOperation({ summary: 'Get pending message envelopes for device' })
  @ApiQuery({ name: 'deviceId', required: false })
  @ApiQuery({ name: 'limit', required: false, example: 100 })
  @ApiOkResponse({ description: 'Pending envelopes fetched successfully.' })
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  getPendingEnvelopes(
    @Req() req: Express.Request,
    @Query('deviceId') deviceId?: string,
    @Query('limit') limit?: string,
    @Headers('x-device-id') deviceHeader?: string,
  ) {
    return this.e2eeChatClient.getPendingEnvelopes({
      userId: req.user.userId,
      deviceId: this.resolveDeviceId(req, deviceId, deviceHeader),
      limit: Number(limit ?? 100),
    });
  }

  @Patch('messages/:id')
  @ApiOperation({ summary: 'Edit encrypted message' })
  @ApiParam({ name: 'id', example: '68844a7d8a4f7b0cb3ab5678' })
  @ApiBody({ type: EditE2eeMessageDto })
  @ApiOkResponse({ description: 'Message edited successfully.' })
  @RateLimit(120, 60, { key: RateLimitKeyType.IP_USER_ID })
  editMessage(
    @Req() req: Express.Request,
    @Param('id') id: string,
    @Body() dto: EditE2eeMessageDto & { senderDeviceId?: string },
    @Headers('x-device-id') deviceHeader?: string,
  ) {
    return this.e2eeChatClient.editEncryptedMessage({
      messageId: id,
      senderId: req.user.userId,
      senderDeviceId: this.resolveDeviceId(
        req,
        dto.senderDeviceId,
        deviceHeader,
      ),
      envelopes: dto.envelopes,
    });
  }

  @Delete('messages/:id')
  @ApiOperation({ summary: 'Delete encrypted message' })
  @ApiParam({ name: 'id', example: '68844a7d8a4f7b0cb3ab5678' })
  @ApiQuery({ name: 'forEveryone', required: false, example: false })
  @ApiOkResponse({ description: 'Message deleted successfully.' })
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  deleteMessage(
    @Req() req: Express.Request,
    @Param('id') id: string,
    @Query('forEveryone') forEveryone?: string,
  ) {
    return this.e2eeChatClient.deleteMessage({
      messageId: id,
      userId: req.user.userId,
      forEveryone: forEveryone === 'true',
    });
  }

  @Post('messages/:id/forward')
  @ApiOperation({ summary: 'Forward encrypted message' })
  @ApiParam({ name: 'id', example: '68844a7d8a4f7b0cb3ab5678' })
  @ApiBody({ type: ForwardMessageDto })
  @ApiCreatedResponse({ description: 'Message forwarded successfully.' })
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  forwardMessage(
    @Req() req: Express.Request,
    @Param('id') id: string,
    @Body() dto: ForwardMessageDto,
    @Headers('x-device-id') deviceHeader?: string,
  ) {
    return this.e2eeChatClient.forwardMessage({
      sourceMessageId: id,
      targetConversationId: dto.targetConversationId,
      senderId: req.user.userId,
      senderDeviceId: this.resolveDeviceId(
        req,
        dto.senderDeviceId,
        deviceHeader,
      ),
      envelopes: dto.envelopes,
      attachments: dto.attachments ?? [],
    });
  }

  @Post('messages/:id/receipt')
  @ApiOperation({ summary: 'Mark message delivery/read receipt' })
  @ApiParam({ name: 'id', example: '68844a7d8a4f7b0cb3ab5678' })
  @ApiBody({ type: MarkE2eeReceiptDto })
  @ApiOkResponse({ description: 'Receipt recorded successfully.' })
  @RateLimit(120, 60, { key: RateLimitKeyType.IP_USER_ID })
  markReceipt(
    @Req() req: Express.Request,
    @Param('id') id: string,
    @Body() dto: MarkE2eeReceiptDto,
    @Headers('x-device-id') deviceHeader?: string,
  ) {
    return this.e2eeChatClient.markReceipt({
      messageId: id,
      userId: req.user.userId,
      deviceId: this.resolveDeviceId(req, dto.deviceId, deviceHeader),
      status: dto.status,
    });
  }

  @Post('conversations/:id/read')
  @ApiOperation({ summary: 'Mark E2EE conversation as read' })
  @ApiParam({ name: 'id', example: '68844a7d8a4f7b0cb3ab1234' })
  @ApiBody({ type: MarkConversationReadDto })
  @ApiOkResponse({ description: 'Conversation marked as read.' })
  @RateLimit(120, 60, { key: RateLimitKeyType.IP_USER_ID })
  markConversationRead(
    @Req() req: Express.Request,
    @Param('id') id: string,
    @Body() dto: MarkConversationReadDto,
    @Headers('x-device-id') deviceHeader?: string,
  ) {
    return this.e2eeChatClient.markConversationRead({
      conversationId: id,
      userId: req.user.userId,
      deviceId: this.resolveDeviceId(req, dto.deviceId, deviceHeader),
      upToMessageId: dto.upToMessageId,
    });
  }

  @Post('messages/:id/react')
  @ApiOperation({ summary: 'React to encrypted message' })
  @ApiParam({ name: 'id', example: '68844a7d8a4f7b0cb3ab5678' })
  @ApiBody({ type: ReactE2eeMessageDto })
  @ApiOkResponse({ description: 'Reaction updated successfully.' })
  @RateLimit(120, 60, { key: RateLimitKeyType.IP_USER_ID })
  reactToMessage(
    @Req() req: Express.Request,
    @Param('id') id: string,
    @Body() dto: ReactE2eeMessageDto,
    @Headers('x-device-id') deviceHeader?: string,
  ) {
    return this.e2eeChatClient.reactToMessage({
      messageId: id,
      userId: req.user.userId,
      deviceId: this.resolveDeviceId(req, dto.deviceId, deviceHeader),
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
    return this.e2eeChatClient.pinMessage({
      conversationId: id,
      messageId,
      userId: req.user.userId,
      pinned: dto.pinned,
    });
  }

  @Post('sender-keys')
  @ApiOperation({ summary: 'Upload sender key distributions' })
  @ApiBody({ type: UploadSenderKeyDto })
  @ApiOkResponse({ description: 'Sender keys uploaded successfully.' })
  @RateLimit(30, 60, { key: RateLimitKeyType.IP_USER_ID })
  uploadSenderKeys(
    @Req() req: Express.Request,
    @Body() dto: UploadSenderKeyDto,
    @Headers('x-device-id') deviceHeader?: string,
  ) {
    return this.e2eeChatClient.uploadSenderKeyDistributions({
      conversationId: dto.conversationId,
      senderId: req.user.userId,
      senderDeviceId: this.resolveDeviceId(
        req,
        dto.senderDeviceId,
        deviceHeader,
      ),
      distributions: dto.distributions,
    });
  }

  @Get('conversations/:id/sender-keys')
  @ApiOperation({ summary: 'Get sender key distributions for device' })
  @ApiParam({ name: 'id', example: '68844a7d8a4f7b0cb3ab1234' })
  @ApiQuery({ name: 'deviceId', required: false })
  @ApiOkResponse({ description: 'Sender keys fetched successfully.' })
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  getSenderKeys(
    @Req() req: Express.Request,
    @Param('id') id: string,
    @Query('deviceId') deviceId?: string,
    @Headers('x-device-id') deviceHeader?: string,
  ) {
    return this.e2eeChatClient.getSenderKeyDistributions({
      conversationId: id,
      userId: req.user.userId,
      deviceId: this.resolveDeviceId(req, deviceId, deviceHeader),
    });
  }

  @Get('unread')
  @ApiOperation({ summary: 'Get unread counts across E2EE conversations' })
  @ApiOkResponse({ description: 'Unread counts fetched successfully.' })
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  getUnreadCounts(@Req() req: Express.Request) {
    return this.e2eeChatClient.getUnreadCounts({
      userId: req.user.userId,
    });
  }
}
