import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Media, MediaDocument } from '../schemas/media.schema';
import { SaveFileResult, StorageService } from '../storage/storage.service';
import { ImageService } from '../processing/image.service';
import {
  MediaStatus as ProtoMediaStatus,
  MediaType as ProtoMediaType,
  type CreateMediaRequest,
  type UpdateMediaStatusRequest,
} from '@app/proto-schema/protos-types/media';
import {
  MediaStatus as DbMediaStatus,
  MediaType as DbMediaType,
} from '@app/common';
import { MediaRedisService } from '../redis/redis.service';

const normalizeMediaType = (
  value: ProtoMediaType | DbMediaType | string,
): DbMediaType => {
  if (typeof value === 'number') {
    switch (value) {
      case ProtoMediaType.IMAGE:
        return DbMediaType.IMAGE;
      case ProtoMediaType.VIDEO:
        return DbMediaType.VIDEO;
      case ProtoMediaType.AUDIO:
        return DbMediaType.AUDIO;
      case ProtoMediaType.FILE:
        return DbMediaType.FILE;
      case ProtoMediaType.AVATAR:
        return DbMediaType.AVATAR;
      case ProtoMediaType.COVER:
        return DbMediaType.COVER;
      default:
        break;
    }
  }

  if (typeof value === 'string') {
    const key = value.toUpperCase() as keyof typeof DbMediaType;

    if (DbMediaType[key] !== undefined) {
      return DbMediaType[key];
    }
  }

  throw new BadRequestException('Invalid media type');
};

const normalizeMediaStatus = (
  value: ProtoMediaStatus | DbMediaStatus | string,
): DbMediaStatus => {
  if (typeof value === 'number') {
    switch (value) {
      case ProtoMediaStatus.PENDING:
        return DbMediaStatus.PENDING;
      case ProtoMediaStatus.PROCESSING:
        return DbMediaStatus.PROCESSING;
      case ProtoMediaStatus.DONE:
        return DbMediaStatus.DONE;
      case ProtoMediaStatus.FAILED:
        return DbMediaStatus.FAILED;
      default:
        break;
    }
  }

  if (typeof value === 'string') {
    const key = value.toUpperCase() as keyof typeof DbMediaStatus;

    if (DbMediaStatus[key] !== undefined) {
      return DbMediaStatus[key];
    }
  }

  throw new BadRequestException('Invalid media status');
};

@Injectable()
export class MediaService {
  constructor(
    @InjectModel(Media.name)
    private readonly mediaModel: Model<MediaDocument>,
    private readonly storage: StorageService,
    private readonly imageService: ImageService,
    private readonly redis: MediaRedisService,
  ) {}

  async uploadImage(
    userId: string,
    buffer: Buffer,
    originalName: string,
    mimeType: string,
  ) {
    if (!userId?.trim()) {
      throw new BadRequestException('userId is required to upload media.');
    }

    await this.imageService.validate(buffer, mimeType);

    const processed = await this.imageService.process(buffer);

    let original: SaveFileResult | undefined;

    let medium: SaveFileResult | undefined;

    let thumbnail: SaveFileResult | undefined;

    try {
      [original, medium, thumbnail] = await Promise.all([
        this.storage.saveFile({
          folder: 'images',
          userId,
          variant: 'original',
          extension: processed.extension,
          buffer: processed.original,
        }),

        this.storage.saveFile({
          folder: 'images',
          userId,
          variant: 'medium',
          extension: processed.extension,
          buffer: processed.medium,
        }),

        this.storage.saveFile({
          folder: 'images',
          userId,
          variant: 'thumbnail',
          extension: processed.extension,
          buffer: processed.thumbnail,
        }),
      ]);

      const media = await this.mediaModel.create({
        userId,

        type: DbMediaType.IMAGE,

        originalName,

        fileName: original.fileName,

        path: original.relativePath,

        originalUrl: original.relativePath,

        thumbnailUrl: thumbnail.relativePath,

        mediumUrl: medium.relativePath,

        mimeType: processed.mimeType,

        size: processed.size,

        width: processed.width,

        height: processed.height,

        status: DbMediaStatus.DONE,
      });

      await this.redis.setMedia(media.id, media.toObject());

      return {
        success: true,

        message: 'Image uploaded successfully.',

        media,
      };
    } catch (error) {
      await Promise.all([
        original
          ? this.storage.deleteFile(original.relativePath)
          : Promise.resolve(),

        medium
          ? this.storage.deleteFile(medium.relativePath)
          : Promise.resolve(),

        thumbnail
          ? this.storage.deleteFile(thumbnail.relativePath)
          : Promise.resolve(),
      ]);

      throw error;
    }
  }

  async createMedia(dto: CreateMediaRequest) {
    const media = await this.mediaModel.create({
      ...dto,
      type: normalizeMediaType(dto.type),
      status: normalizeMediaStatus(dto.status),
    });
    await this.redis.setMedia(media.id, media.toObject());

    return {
      success: true,
      message: 'Media created successfully.',
      media,
    };
  }

  async getMedia(mediaId: string) {
    const cached = await this.redis.getMedia<Media>(mediaId);

    if (cached) {
      return {
        success: true,
        message: 'Media fetched successfully.',
        media: cached,
      };
    }
    const media = await this.mediaModel.findById(mediaId);

    if (!media) {
      throw new NotFoundException('Media not found.');
    }
    await this.redis.setMedia(media.id, media.toObject());

    return {
      success: true,
      message: 'Media fetched successfully.',
      media,
    };
  }

  async listUserMedia(
    userId: string,
    type: DbMediaType | ProtoMediaType | string,
    page: number,
    limit: number,
  ) {
    const filter: { userId: string; isDeleted: boolean; type?: DbMediaType } = {
      userId,
      isDeleted: false,
    };

    if (type && type !== 'all') {
      filter.type = normalizeMediaType(type);
    }

    const skip = (page - 1) * limit;

    const [media, total] = await Promise.all([
      this.mediaModel
        .find(filter)
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit),

      this.mediaModel.countDocuments(filter),
    ]);

    return {
      success: true,
      message: 'Media fetched successfully.',
      media,
      total,
      page,
      limit,
    };
  }

  async deleteMedia(mediaId: string, userId: string) {
    const media = await this.mediaModel.findOne({
      _id: mediaId,
      userId,
    });

    if (!media) {
      throw new NotFoundException('Media not found.');
    }

    media.isDeleted = true;
    media.deletedAt = new Date();

    await media.save();
    await this.redis.deleteMedia(media.id);

    return {
      success: true,
      message: 'Media deleted successfully.',
    };
  }

  async exists(mediaId: string) {
    const exists = await this.mediaModel.exists({
      _id: mediaId,
      isDeleted: false,
    });

    return {
      success: true,
      message: 'Checked successfully.',
      exists: !!exists,
    };
  }

  async updateMediaStatus(
    dto:
      | UpdateMediaStatusRequest
      | {
          mediaId: string;
          status: string | ProtoMediaStatus | DbMediaStatus;
          originalUrl?: string;
          thumbnailUrl?: string;
          mediumUrl?: string;
        },
  ) {
    const media = await this.mediaModel.findById(dto.mediaId);

    if (!media) {
      throw new NotFoundException();
    }

    Object.assign(media, {
      ...dto,
      status: normalizeMediaStatus(dto.status),
    });

    await media.save();
    await this.redis.deleteMedia(media.id);

    return {
      success: true,
      message: 'Status updated successfully.',
      media,
    };
  }

  async getMediaByPath(path: string) {
    const media = await this.mediaModel.findOne({
      path,
      isDeleted: false,
    });

    if (!media) {
      throw new NotFoundException();
    }
    await this.redis.setMedia(media.id, media.toObject());
    return {
      success: true,
      message: 'Media fetched successfully.',
      media,
    };
  }

  async getMediaByIds(mediaIds: string[]) {
    const ids = [...new Set(mediaIds.filter(Boolean))];

    if (!ids.length) {
      return {
        success: true,
        message: 'No media found.',
        media: [],
      };
    }

    const result: Media[] = [];

    const missingIds: string[] = [];

    for (const id of ids) {
      const cached = await this.redis.getMedia<Media>(id);

      if (cached) {
        result.push(cached);
      } else {
        missingIds.push(id);
      }
    }

    if (missingIds.length) {
      const medias = await this.mediaModel.find({
        _id: {
          $in: missingIds,
        },
        isDeleted: false,
        status: DbMediaStatus.DONE,
      });

      for (const media of medias) {
        const plain = media.toObject();

        await this.redis.setMedia(media.id, plain);

        result.push(plain);
      }
    }

    return {
      success: true,
      message: 'Media fetched successfully.',
      media: result,
    };
  }
}
