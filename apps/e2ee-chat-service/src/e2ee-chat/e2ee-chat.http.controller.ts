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
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
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
  type JwtPayload,
} from '@app/common';
import { E2eeChatService } from './e2ee-chat.service';

interface AuthRequest {
  user: JwtPayload;
}

@ApiTags('E2EE Chat')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('e2ee/chat')
export class E2eeChatHttpController {
  constructor(private readonly e2eeChatService: E2eeChatService) {}

  @Post('conversations/direct')
  @ApiOperation({ summary: 'Get or create direct E2EE conversation' })
  @ApiBody({ type: StartE2eeConversationDto })
  @ApiOkResponse({ description: 'Conversation returned' })
  getOrCreateDirect(
    @Req() req: AuthRequest,
    @Body() body: StartE2eeConversationDto,
  ) {
    return this.e2eeChatService.getOrCreateDirectConversation(
      req.user.userId,
      body.targetUserId,
    );
  }

  @Post('groups')
  @ApiOperation({ summary: 'Create E2EE group' })
  @ApiBody({ type: CreateE2eeGroupDto })
  createGroup(@Req() req: AuthRequest, @Body() body: CreateE2eeGroupDto) {
    return this.e2eeChatService.createGroup({
      name: body.name,
      creatorId: req.user.userId,
      participantIds: body.participantIds,
      avatar: body.avatar,
    });
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List E2EE conversations' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'archived', required: false })
  getConversations(
    @Req() req: AuthRequest,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('archived') archived?: string,
  ) {
    return this.e2eeChatService.getConversations(
      req.user.userId,
      Number(page),
      Number(limit),
      archived === 'true',
    );
  }

  @Get('conversations/:conversationId')
  @ApiOperation({ summary: 'Get E2EE conversation' })
  @ApiParam({ name: 'conversationId' })
  getConversation(
    @Req() req: AuthRequest,
    @Param('conversationId') conversationId: string,
  ) {
    return this.e2eeChatService.getConversation(
      conversationId,
      req.user.userId,
    );
  }

  @Post('groups/:conversationId/members')
  @ApiOperation({ summary: 'Add group member' })
  @ApiParam({ name: 'conversationId' })
  @ApiBody({ type: AddE2eeGroupMemberDto })
  addGroupMember(
    @Req() req: AuthRequest,
    @Param('conversationId') conversationId: string,
    @Body() body: AddE2eeGroupMemberDto,
  ) {
    return this.e2eeChatService.addGroupMember(
      conversationId,
      req.user.userId,
      body.userId,
      body.role,
    );
  }

  @Delete('groups/:conversationId/members/:userId')
  @ApiOperation({ summary: 'Remove group member' })
  removeGroupMember(
    @Req() req: AuthRequest,
    @Param('conversationId') conversationId: string,
    @Param('userId') userId: string,
  ) {
    return this.e2eeChatService.removeGroupMember(
      conversationId,
      req.user.userId,
      userId,
    );
  }

  @Post('groups/:conversationId/leave')
  @ApiOperation({ summary: 'Leave group' })
  leaveGroup(
    @Req() req: AuthRequest,
    @Param('conversationId') conversationId: string,
  ) {
    return this.e2eeChatService.leaveGroup(conversationId, req.user.userId);
  }

  @Patch('groups/:conversationId/members/:userId/role')
  @ApiOperation({ summary: 'Update member role' })
  @ApiBody({ type: UpdateE2eeMemberRoleDto })
  updateMemberRole(
    @Req() req: AuthRequest,
    @Param('conversationId') conversationId: string,
    @Param('userId') userId: string,
    @Body() body: UpdateE2eeMemberRoleDto,
  ) {
    return this.e2eeChatService.updateMemberRole(
      conversationId,
      req.user.userId,
      userId,
      body.role,
    );
  }

  @Patch('conversations/:conversationId/mute')
  @ApiOperation({ summary: 'Mute/unmute conversation' })
  @ApiBody({ type: MuteConversationDto })
  muteConversation(
    @Req() req: AuthRequest,
    @Param('conversationId') conversationId: string,
    @Body() body: MuteConversationDto,
  ) {
    return this.e2eeChatService.muteConversation(
      conversationId,
      req.user.userId,
      body.muted,
      body.mutedUntil,
    );
  }

  @Patch('conversations/:conversationId/archive')
  @ApiOperation({ summary: 'Archive/unarchive conversation' })
  @ApiBody({ type: ArchiveConversationDto })
  archiveConversation(
    @Req() req: AuthRequest,
    @Param('conversationId') conversationId: string,
    @Body() body: ArchiveConversationDto,
  ) {
    return this.e2eeChatService.archiveConversation(
      conversationId,
      req.user.userId,
      body.archived,
    );
  }

  @Patch('conversations/:conversationId/pin')
  @ApiOperation({ summary: 'Pin/unpin conversation' })
  @ApiBody({ type: PinConversationDto })
  pinConversation(
    @Req() req: AuthRequest,
    @Param('conversationId') conversationId: string,
    @Body() body: PinConversationDto,
  ) {
    return this.e2eeChatService.pinConversation(
      conversationId,
      req.user.userId,
      body.pinned,
    );
  }

  @Post('messages')
  @ApiOperation({ summary: 'Send encrypted message' })
  @ApiBody({ type: SendE2eeMessageDto })
  sendMessage(@Req() req: AuthRequest, @Body() body: SendE2eeMessageDto) {
    return this.e2eeChatService.sendEncryptedMessage({
      conversationId: body.conversationId,
      senderId: req.user.userId,
      senderDeviceId: body.senderDeviceId,
      type: body.type,
      envelopes: body.envelopes,
      attachments: body.attachments,
      replyToMessageId: body.replyToMessageId,
      forwardedFromMessageId: body.forwardedFromMessageId,
      clientMessageId: body.clientMessageId,
    });
  }

  @Get('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Get encrypted messages' })
  @ApiParam({ name: 'conversationId' })
  getMessages(
    @Req() req: AuthRequest,
    @Param('conversationId') conversationId: string,
    @Query('deviceId') deviceId: string,
    @Query() query: E2eePaginationDto,
  ) {
    return this.e2eeChatService.getMessages(
      conversationId,
      req.user.userId,
      deviceId || req.user.deviceId || '',
      Number(query.page ?? 1),
      Number(query.limit ?? 50),
      query.beforeMessageId,
      query.afterMessageId,
    );
  }

  @Get('envelopes/pending')
  @ApiOperation({ summary: 'Get pending envelopes for device' })
  @ApiQuery({ name: 'deviceId', required: true })
  @ApiQuery({ name: 'limit', required: false })
  getPendingEnvelopes(
    @Req() req: AuthRequest,
    @Query('deviceId') deviceId: string,
    @Query('limit') limit = 100,
  ) {
    return this.e2eeChatService.getPendingEnvelopes(
      req.user.userId,
      deviceId || req.user.deviceId || '',
      Number(limit),
    );
  }

  @Patch('messages/:messageId')
  @ApiOperation({ summary: 'Edit encrypted message' })
  @ApiBody({ type: EditE2eeMessageDto })
  editMessage(
    @Req() req: AuthRequest,
    @Param('messageId') messageId: string,
    @Body() body: EditE2eeMessageDto & { senderDeviceId: string },
  ) {
    return this.e2eeChatService.editEncryptedMessage({
      messageId,
      senderId: req.user.userId,
      senderDeviceId: body.senderDeviceId,
      envelopes: body.envelopes,
    });
  }

  @Delete('messages/:messageId')
  @ApiOperation({ summary: 'Delete encrypted message' })
  @ApiQuery({ name: 'forEveryone', required: false })
  deleteMessage(
    @Req() req: AuthRequest,
    @Param('messageId') messageId: string,
    @Query('forEveryone') forEveryone?: string,
  ) {
    return this.e2eeChatService.deleteMessage(
      messageId,
      req.user.userId,
      forEveryone === 'true',
    );
  }

  @Post('messages/forward')
  @ApiOperation({ summary: 'Forward encrypted message' })
  forwardMessage(@Req() req: AuthRequest, @Body() body: ForwardMessageDto) {
    return this.e2eeChatService.forwardMessage({
      sourceMessageId: body.sourceMessageId,
      targetConversationId: body.targetConversationId,
      senderId: req.user.userId,
      senderDeviceId: body.senderDeviceId,
      envelopes: body.envelopes,
      attachments: body.attachments,
    });
  }

  @Post('receipts')
  @ApiOperation({ summary: 'Mark message receipt' })
  @ApiBody({ type: MarkE2eeReceiptDto })
  markReceipt(@Req() req: AuthRequest, @Body() body: MarkE2eeReceiptDto) {
    return this.e2eeChatService.markReceipt(
      body.messageId,
      req.user.userId,
      body.deviceId,
      body.status,
    );
  }

  @Post('conversations/:conversationId/read')
  @ApiOperation({ summary: 'Mark conversation as read' })
  @ApiBody({ type: MarkConversationReadDto })
  markConversationRead(
    @Req() req: AuthRequest,
    @Param('conversationId') conversationId: string,
    @Body() body: MarkConversationReadDto,
  ) {
    return this.e2eeChatService.markConversationRead(
      conversationId,
      req.user.userId,
      body.deviceId,
      body.upToMessageId,
    );
  }

  @Post('messages/:messageId/react')
  @ApiOperation({ summary: 'React to encrypted message' })
  @ApiBody({ type: ReactE2eeMessageDto })
  reactToMessage(
    @Req() req: AuthRequest,
    @Param('messageId') messageId: string,
    @Body() body: ReactE2eeMessageDto,
  ) {
    return this.e2eeChatService.reactToMessage(
      messageId,
      req.user.userId,
      body.deviceId,
      body.emoji,
    );
  }

  @Patch('conversations/:conversationId/messages/:messageId/pin')
  @ApiOperation({ summary: 'Pin/unpin message in conversation' })
  @ApiBody({ type: PinMessageDto })
  pinMessage(
    @Req() req: AuthRequest,
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
    @Body() body: PinMessageDto,
  ) {
    return this.e2eeChatService.pinMessage(
      conversationId,
      messageId,
      req.user.userId,
      body.pinned,
    );
  }

  @Post('sender-keys')
  @ApiOperation({ summary: 'Upload sender key distributions' })
  @ApiBody({ type: UploadSenderKeyDto })
  uploadSenderKeys(@Req() req: AuthRequest, @Body() body: UploadSenderKeyDto) {
    return this.e2eeChatService.uploadSenderKeyDistributions({
      conversationId: body.conversationId,
      senderId: req.user.userId,
      senderDeviceId: body.senderDeviceId,
      distributions: body.distributions,
    });
  }

  @Get('sender-keys/:conversationId')
  @ApiOperation({ summary: 'Get sender key distributions for device' })
  @ApiQuery({ name: 'deviceId', required: true })
  getSenderKeys(
    @Req() req: AuthRequest,
    @Param('conversationId') conversationId: string,
    @Query('deviceId') deviceId: string,
  ) {
    return this.e2eeChatService.getSenderKeyDistributions(
      conversationId,
      req.user.userId,
      deviceId || req.user.deviceId || '',
    );
  }

  @Get('unread')
  @ApiOperation({ summary: 'Get unread counts' })
  getUnreadCounts(@Req() req: AuthRequest) {
    return this.e2eeChatService.getUnreadCounts(req.user.userId);
  }

  @Get('groups/:conversationId/members/notification')
  @ApiOperation({
    summary: 'Get group members for notifications',
  })
  @ApiParam({ name: 'conversationId' })
  getGroupMembersForNotif(@Param('conversationId') conversationId: string) {
    return this.e2eeChatService.getGroupMembersForNotif(conversationId);
  }
}
