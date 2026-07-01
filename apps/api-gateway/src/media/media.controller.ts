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
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@app/common';
import * as Express from 'express';
import { MediaClient } from './media.client';

@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaClient: MediaClient) {}

  @Post('upload/image')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  uploadImage(@Req() req: Express.Request, @UploadedFile() file: any) {
    return this.mediaClient.uploadImage(
      req.user.userId,
      file.buffer,
      file.originalname,
      file.mimetype,
    );
  }

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  create(@Req() req: Express.Request, @Body() dto: any) {
    return this.mediaClient.createMedia({
      ...dto,
      userId: req.user.userId,
    });
  }

  @Get(':mediaId')
  getMedia(@Param('mediaId') mediaId: string) {
    return this.mediaClient.getMedia(mediaId);
  }

  @Post('batch')
  getMediaByIds(@Body('mediaIds') mediaIds: string[]) {
    return this.mediaClient.getMediaByIds(mediaIds);
  }

  @Get()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  list(
    @Req() req: Express.Request,
    @Query('type') type = 'all',
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.mediaClient.listUserMedia(
      req.user.userId,
      type,
      Number(page),
      Number(limit),
    );
  }

  @Delete(':mediaId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  remove(@Req() req: Express.Request, @Param('mediaId') mediaId: string) {
    return this.mediaClient.deleteMedia(mediaId, req.user.userId);
  }

  @Patch(':mediaId/status')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  updateStatus(@Param('mediaId') mediaId: string, @Body() dto: any) {
    return this.mediaClient.updateMediaStatus({
      mediaId,
      ...dto,
    });
  }

  @Get(':mediaId/exists')
  exists(@Param('mediaId') mediaId: string) {
    return this.mediaClient.exists(mediaId);
  }

  @Get('path/find')
  getByPath(@Query('path') path: string) {
    return this.mediaClient.getMediaByPath(path);
  }
}
