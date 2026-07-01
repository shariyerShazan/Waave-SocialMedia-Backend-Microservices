import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { MediaService } from './media.service';

import type {
  CreateMediaRequest,
  DeleteMediaRequest,
  ExistsRequest,
  GetMediaByIdsRequest,
  GetMediaRequest,
  GetMediaByPathRequest,
  ListUserMediaRequest,
  UpdateMediaStatusRequest,
  UploadImageRequest,
} from '@app/proto-schema/protos-types/media';

@Controller()
export class MediaGrpcController {
  constructor(private readonly mediaService: MediaService) {}

  @GrpcMethod('MediaService', 'UploadImage')
  uploadImage(data: UploadImageRequest) {
    return this.mediaService.uploadImage(
      data.userId,
      Buffer.from(data.buffer),
      data.originalName,
      data.mimeType,
    );
  }

  @GrpcMethod('MediaService', 'CreateMedia')
  createMedia(data: CreateMediaRequest) {
    return this.mediaService.createMedia(data);
  }

  @GrpcMethod('MediaService', 'GetMedia')
  getMedia(data: GetMediaRequest) {
    return this.mediaService.getMedia(data.mediaId);
  }

  @GrpcMethod('MediaService', 'ListUserMedia')
  listUserMedia(data: ListUserMediaRequest) {
    return this.mediaService.listUserMedia(
      data.userId,
      data.type,
      data.page,
      data.limit,
    );
  }

  @GrpcMethod('MediaService', 'DeleteMedia')
  deleteMedia(data: DeleteMediaRequest) {
    return this.mediaService.deleteMedia(data.mediaId, data.userId);
  }

  @GrpcMethod('MediaService', 'Exists')
  exists(data: ExistsRequest) {
    return this.mediaService.exists(data.mediaId);
  }

  @GrpcMethod('MediaService', 'UpdateMediaStatus')
  updateMediaStatus(data: UpdateMediaStatusRequest) {
    return this.mediaService.updateMediaStatus(data);
  }

  @GrpcMethod('MediaService', 'GetMediaByPath')
  getMediaByPath(data: GetMediaByPathRequest) {
    return this.mediaService.getMediaByPath(data.path);
  }

  @GrpcMethod('MediaService', 'GetMediaByIds')
  getMediaByIds(data: GetMediaByIdsRequest) {
    return this.mediaService.getMediaByIds(data.mediaIds);
  }
}
