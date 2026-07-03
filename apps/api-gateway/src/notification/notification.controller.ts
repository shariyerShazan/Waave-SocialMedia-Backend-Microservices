import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import * as Express from 'express';

import { AuthGuard } from '@app/common';

import { NotificationClient } from './notification.client';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationClient: NotificationClient) {}

  @Get()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get notifications',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
  })
  getNotifications(
    @Req() req: Express.Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationClient.getNotifications(
      req?.user?.userId,
      Number(page ?? 1),
      Number(limit ?? 20),
    );
  }

  @Patch(':id/read')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  markAsRead(@Req() req: Express.Request, @Param('id') id: string) {
    return this.notificationClient.markAsRead(req?.user?.userId, id);
  }

  @Patch('read-all')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  markAllAsRead(@Req() req: Express.Request) {
    return this.notificationClient.markAllAsRead(req?.user?.userId);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  deleteNotification(@Req() req: Express.Request, @Param('id') id: string) {
    return this.notificationClient.deleteNotification(req?.user?.userId, id);
  }

  @Get('preferences')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  getPreferences(@Req() req: Express.Request) {
    return this.notificationClient.getPreferences(req?.user?.userId);
  }

  @Patch('preferences')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiBody({
    schema: {
      example: {
        likes: true,
        comments: true,
        follows: true,
        unfollows: true,
        mentions: true,
        messages: true,
      },
    },
  })
  updatePreferences(@Req() req: Express.Request, @Body() dto: any) {
    return this.notificationClient.updatePreferences(req?.user?.userId, dto);
  }
}
