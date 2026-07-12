/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { UserGrpcClient } from '../clients/user-grpc.client';
import { MediaGrpcClient } from '../clients/media-grpc.clinet';
@Injectable()
export class FeedEnrichmentService {
  private readonly logger = new Logger(FeedEnrichmentService.name);

  constructor(
    private readonly userClient: UserGrpcClient,
    private readonly mediaClient: MediaGrpcClient,
  ) {}

  async enrichPosts<T extends Record<string, any>>(posts: T[]): Promise<T[]> {
    if (!posts.length) return [];

    try {
      const userIds = [...new Set(posts.map((p) => p.userId).filter(Boolean))];

      const usersResult = await this.userClient.getUsersByIds(userIds);

      const users = usersResult.users || [];

      const userMap = new Map<string, any>(users.map((u: any) => [u.id, u]));

      const mediaIds = [
        ...posts.flatMap((post) => post.mediaIds || []),

        ...users.map((u: any) => u.avatarMediaId),

        ...users.map((u: any) => u.coverMediaId),
      ].filter(Boolean);

      const mediaMap = await this.fetchMediaMap([...new Set(mediaIds)]);

      return posts.map((post) => {
        const author = userMap.get(post.userId);

        return {
          ...post,

          media: (post.mediaIds || [])
            .map((id: string) => {
              const media = mediaMap.get(id);

              if (!media) return null;

              return {
                ...media,
                url: this.resolveMediaUrl(id, mediaMap),
              };
            })
            .filter(Boolean),

          author: author
            ? {
                id: author.id,
                username: author.username,
                fullName: author.fullName,
                verified: author.verified,

                avatar: this.resolveMediaUrl(author.avatarMediaId, mediaMap),

                coverImg: this.resolveMediaUrl(author.coverMediaId, mediaMap),
              }
            : null,
        };
      });
    } catch (err) {
      this.logger.error('Failed to enrich feed', err);
      return posts;
    }
  }

  private async fetchMediaMap(mediaIds: string[]) {
    const mediaMap = new Map<string, any>();

    if (!mediaIds.length) {
      return mediaMap;
    }

    try {
      const response = await this.mediaClient.getMediaByIds(mediaIds);

      for (const media of response.media || []) {
        mediaMap.set(media.id, media);
      }
    } catch (err) {
      this.logger.error('Failed to fetch media', err);
    }

    return mediaMap;
  }

  private resolveMediaUrl(
    mediaId: string | undefined,
    mediaMap: Map<string, any>,
  ) {
    if (!mediaId) return '';

    const media = mediaMap.get(mediaId);

    if (!media) return '';

    const path =
      media.mediumUrl || media.originalUrl || media.thumbnailUrl || media.path;

    if (!path) return '';

    return this.buildPublicMediaUrl(path);
  }

  private buildPublicMediaUrl(path: string) {
    if (!path) return '';

    if (/^https?:\/\//i.test(path)) {
      return path;
    }

    const base = process.env.MEDIA_HTTP_BASE_URL || 'http://localhost:4009';

    return `${base.replace(/\/$/, '')}/media/${path.replace(/^\/?media\//, '')}`;
  }
}
