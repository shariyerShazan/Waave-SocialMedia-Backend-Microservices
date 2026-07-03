/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { NotificationService } from 'apps/notification/src/notification/notification.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationHttpController {
  constructor(private readonly notifService: NotificationService) {}

  @Get()
  @ApiOperation({
    summary: 'Get user notifications',
    description: 'Returns paginated notifications for the authenticated user.',
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
    @Req() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.notifService.getNotifications(req.user.id, +page, +limit);
  }

  @Patch(':id/read')
  @ApiOperation({
    summary: 'Mark notification as read',
  })
  @ApiParam({
    name: 'id',
    description: 'Notification ID',
    example: '6865d0f2d4d9a9c7d15b8d22',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read.',
  })
  markAsRead(@Param('id') id: string, @Req() req: any) {
    return this.notifService.markAsRead(req.user.id, id);
  }

  @Patch('read-all')
  @ApiOperation({
    summary: 'Mark all notifications as read',
  })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read.',
  })
  markAllAsRead(@Req() req: any) {
    return this.notifService.markAllAsRead(req.user.id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete notification',
  })
  @ApiParam({
    name: 'id',
    description: 'Notification ID',
    example: '6865d0f2d4d9a9c7d15b8d22',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification deleted successfully.',
  })
  deleteNotification(@Param('id') id: string, @Req() req: any) {
    return this.notifService.deleteNotification(req.user.id, id);
  }

  @Get('preferences')
  @ApiOperation({
    summary: 'Get notification preferences',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification preferences retrieved successfully.',
  })
  getPreferences(@Req() req: any) {
    return this.notifService.getPreferences(req.user.id);
  }

  @Patch('preferences')
  @ApiOperation({
    summary: 'Update notification preferences',
  })
  @ApiBody({
    schema: {
      example: {
        likes: true,
        comments: true,
        follows: false,
        mentions: true,
        messages: true,
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Notification preferences updated successfully.',
  })
  updatePreferences(@Req() req: any, @Body() dto: any) {
    return this.notifService.updatePreferences(req.user.id, dto);
  }
}
