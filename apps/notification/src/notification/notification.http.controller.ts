import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { NotificationService } from 'apps/notification/src/notification/notification.service';

class UserIdDto {
  @ApiProperty({
    example: '6865d0f2d4d9a9c7d15b8d22',
    description: 'Authenticated User ID (Testing only)',
  })
  userId: string;
}

class UpdatePreferencesDto extends UserIdDto {
  @ApiProperty({ example: true })
  likes: boolean;

  @ApiProperty({ example: true })
  comments: boolean;

  @ApiProperty({ example: true })
  follows: boolean;

  @ApiProperty({ example: true })
  unfollows: boolean;

  @ApiProperty({ example: true })
  mentions: boolean;

  @ApiProperty({ example: true })
  messages: boolean;
}

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationHttpController {
  constructor(private readonly notifService: NotificationService) {}

  // ─────────────────────────────────────────────
  // Get Notifications
  // ─────────────────────────────────────────────
  @Get()
  @ApiOperation({
    summary: 'Get user notifications',
    description: 'Returns paginated notifications for a user (Testing only).',
  })
  @ApiQuery({
    name: 'userId',
    required: true,
    example: '6865d0f2d4d9a9c7d15b8d22',
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
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully.',
  })
  getNotifications(
    @Query('userId') userId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.notifService.getNotifications(userId, +page, +limit);
  }

  // ─────────────────────────────────────────────
  // Mark As Read
  // ─────────────────────────────────────────────
  @Patch(':notificationId/read')
  @ApiOperation({
    summary: 'Mark notification as read',
  })
  @ApiParam({
    name: 'notificationId',
    description: 'Notification ID',
    example: '6865d0f2d4d9a9c7d15b8d22',
  })
  @ApiBody({
    type: UserIdDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read.',
  })
  markAsRead(
    @Param('notificationId') notificationId: string,
    @Body() dto: UserIdDto,
  ) {
    return this.notifService.markAsRead(dto.userId, notificationId);
  }

  // ─────────────────────────────────────────────
  // Mark All As Read
  // ─────────────────────────────────────────────
  @Patch('read-all')
  @ApiOperation({
    summary: 'Mark all notifications as read',
  })
  @ApiBody({
    type: UserIdDto,
  })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read.',
  })
  markAllAsRead(@Body() dto: UserIdDto) {
    return this.notifService.markAllAsRead(dto.userId);
  }

  // ─────────────────────────────────────────────
  // Delete Notification
  // ─────────────────────────────────────────────
  @Delete(':notificationId')
  @ApiOperation({
    summary: 'Delete notification',
  })
  @ApiParam({
    name: 'notificationId',
    description: 'Notification ID',
    example: '6865d0f2d4d9a9c7d15b8d22',
  })
  @ApiBody({
    type: UserIdDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Notification deleted successfully.',
  })
  deleteNotification(
    @Param('notificationId') notificationId: string,
    @Body() dto: UserIdDto,
  ) {
    return this.notifService.deleteNotification(dto.userId, notificationId);
  }

  // ─────────────────────────────────────────────
  // Get Preferences
  // ─────────────────────────────────────────────
  @Get('preferences')
  @ApiOperation({
    summary: 'Get notification preferences',
  })
  @ApiQuery({
    name: 'userId',
    required: true,
    example: '6865d0f2d4d9a9c7d15b8d22',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification preferences retrieved successfully.',
  })
  getPreferences(@Query('userId') userId: string) {
    return this.notifService.getPreferences(userId);
  }

  // ─────────────────────────────────────────────
  // Update Preferences
  // ─────────────────────────────────────────────
  @Patch('preferences')
  @ApiOperation({
    summary: 'Update notification preferences',
  })
  @ApiBody({
    type: UpdatePreferencesDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Notification preferences updated successfully.',
  })
  updatePreferences(@Body() dto: UpdatePreferencesDto) {
    const { userId, ...preferences } = dto;

    return this.notifService.updatePreferences(userId, preferences);
  }
}
