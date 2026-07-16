import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import {
  GetConversationDto,
  StartConversationDto,
  CreateGroupDto,
  AddGroupMemberDto,
  MarkReadDto,
  DeleteMessageDto,
} from '@app/common/dto/chat/chat.dto';

@ApiTags('Chat')
@Controller('chat')
export class ChatHttpController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Get conversation list' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiBody({ type: GetConversationDto })
  getConversations(
    @Body() body: GetConversationDto,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.chatService.getConversations(body.userId, +page, +limit);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get conversation messages' })
  @ApiBody({ type: GetConversationDto })
  getMessages(
    @Param('id') conversationId: string,
    @Body() body: GetConversationDto,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    return this.chatService.getMessages(
      conversationId,
      body.userId,
      +page,
      +limit,
    );
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Start conversation' })
  startConversation(@Body() dto: StartConversationDto) {
    return this.chatService.getOrCreateConversation(
      dto.userId,
      dto.targetUserId,
    );
  }

  @Post('groups')
  @ApiOperation({ summary: 'Create group' })
  createGroup(@Body() dto: CreateGroupDto) {
    return this.chatService.createGroup({
      ...dto,
      creatorId: dto.userId,
    });
  }

  @Post('groups/:id/members')
  @ApiOperation({ summary: 'Add member to group' })
  addMember(@Param('id') groupId: string, @Body() dto: AddGroupMemberDto) {
    return this.chatService.addGroupMember(
      groupId,
      dto.userId,
      dto.targetUserId,
    );
  }

  @Post('conversations/:id/read')
  @ApiOperation({ summary: 'Mark conversation as read' })
  markAsRead(@Param('id') conversationId: string, @Body() dto: MarkReadDto) {
    return this.chatService.markAsRead(conversationId, dto.userId);
  }

  @Delete('messages/:id')
  @ApiOperation({ summary: 'Delete message' })
  deleteMessage(@Param('id') messageId: string, @Body() dto: DeleteMessageDto) {
    return this.chatService.deleteMessage(messageId, dto.userId);
  }
}
