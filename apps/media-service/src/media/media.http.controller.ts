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
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

import { MediaService } from './media.service';
import { UpdateMediaStatusDto, UploadImageDto } from '@app/common';

@ApiTags('Media')
@Controller('media')
export class MediaHttpController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload/image')
  @ApiOperation({ summary: 'Upload image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
        },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['userId', 'file'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadImageDto,
    @Req() req: any,
  ) {
    const userId = String(
      dto?.userId ??
        req.body?.userId ??
        req.query?.userId ??
        req.headers['x-user-id'] ??
        '',
    ).trim();

    return this.mediaService.uploadImage(
      userId,
      file.buffer,
      file.originalname,
      file.mimetype,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create media metadata' })
  createMedia(@Body() dto: any) {
    return this.mediaService.createMedia(dto);
  }

  @Get(':mediaId')
  @ApiOperation({ summary: 'Get media by id' })
  @ApiParam({
    name: 'mediaId',
  })
  getMedia(@Param('mediaId') mediaId: string) {
    return this.mediaService.getMedia(mediaId);
  }

  @Get()
  @ApiOperation({ summary: 'List user media' })
  @ApiQuery({
    name: 'userId',
  })
  @ApiQuery({
    name: 'type',
    required: false,
  })
  @ApiQuery({
    name: 'page',
    required: false,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
  })
  listUserMedia(
    @Query('userId') userId: string,
    @Query('type') type = 'all',
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.mediaService.listUserMedia(
      userId,
      type,
      Number(page),
      Number(limit),
    );
  }

  @Delete(':mediaId')
  @ApiOperation({ summary: 'Delete media' })
  @ApiParam({
    name: 'mediaId',
  })
  @ApiQuery({
    name: 'userId',
  })
  deleteMedia(
    @Param('mediaId') mediaId: string,
    @Query('userId') userId: string,
  ) {
    return this.mediaService.deleteMedia(mediaId, userId);
  }

  @Get('exists/:mediaId')
  @ApiOperation({ summary: 'Check media exists' })
  @ApiParam({
    name: 'mediaId',
  })
  exists(@Param('mediaId') mediaId: string) {
    return this.mediaService.exists(mediaId);
  }

  @Patch('status')
  @ApiOperation({ summary: 'Update media status' })
  updateMediaStatus(@Body() dto: UpdateMediaStatusDto) {
    return this.mediaService.updateMediaStatus(dto);
  }

  @Get('path')
  @ApiOperation({ summary: 'Get media by path' })
  @ApiQuery({
    name: 'path',
  })
  getMediaByPath(@Query('path') path: string) {
    return this.mediaService.getMediaByPath(path);
  }

  @Post('batch')
  @ApiOperation({ summary: 'Get media by ids' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        mediaIds: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
      },
    },
  })
  getMediaByIds(@Body('mediaIds') mediaIds: string[]) {
    return this.mediaService.getMediaByIds(mediaIds);
  }
}
