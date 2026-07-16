/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { MediaGrpcClient, UserGrpcClient } from '@app/clients';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PostEnrichmentService {
  private readonly logger = new Logger(PostEnrichmentService.name);

  constructor(
    private readonly mediaClient: MediaGrpcClient,
    private readonly userClient: UserGrpcClient,
  ) {}

  async enrichPosts<T extends Record<string, any>>(posts: T[]): Promise<T[]> {
    if (!posts.length) return posts;

    try {
      const userIds = Array.from(
        new Set(posts.map((post) => post.userId).filter(Boolean)),
      );

      const userMap = await this.fetchUserMap(userIds);

      const mediaIds = posts
        .flatMap((post) => post.mediaIds ?? [])
        .filter(Boolean);

      const mediaMap = await this.fetchMediaMap(Array.from(new Set(mediaIds)));

      return posts.map((post) => {
        const user = userMap.get(post.userId);
        const avatarUrl = user?.avatar?.url || '';

        const author = user
          ? {
              id: user.id,
              username: user.email?.split('@')?.[0] || user.name || '',
              fullName: user.name || '',
              avatar: avatarUrl,
              verified: user.isVerified || false,
            }
          : null;

        const media = (post.mediaIds ?? [])
          .map((id: string) => {
            const m = mediaMap.get(id);
            if (!m) return null;

            return {
              id: m.id,
              url: this.resolveMediaUrl(id, mediaMap),
              type: m.type ? String(m.type) : 'IMAGE',
              mimeType: m.mimeType || '',
            };
          })
          .filter(Boolean);

        return {
          ...post,
          author,
          media,
        };
      });
    } catch (err) {
      this.logger.error('Failed to enrich posts', err);
      return posts;
    }
  }

  async enrichPost<T extends Record<string, any>>(post: T): Promise<T> {
    const [result] = await this.enrichPosts([post]);
    return result;
  }

  async enrichComments<T extends Record<string, any>>(
    comments: T[],
  ): Promise<T[]> {
    if (!comments.length) return comments;

    try {
      const userIds = Array.from(
        new Set(comments.map((c) => c.userId).filter(Boolean)),
      );

      const userMap = await this.fetchUserMap(userIds);

      return comments.map((comment) => {
        const user = userMap.get(comment.userId);
        const avatarUrl = user?.avatar?.url || '';

        const author = user
          ? {
              id: user.id,
              username: user.email?.split('@')?.[0] || user.name || '',
              fullName: user.name || '',
              avatar: avatarUrl,
              verified: user.isVerified || false,
            }
          : null;

        return {
          ...comment,
          author,
        };
      });
    } catch (err) {
      this.logger.error('Failed to enrich comments', err);
      return comments;
    }
  }

  private async fetchMediaMap(mediaIds: string[]) {
    const map = new Map<string, any>();
    if (!mediaIds.length) return map;

    try {
      const response = await this.mediaClient.getMediaByIds(mediaIds);
      for (const media of response.media ?? []) {
        map.set(media.id, media);
      }
    } catch (err: any) {
      this.logger.warn(
        `Failed to fetch media for ids ${mediaIds.join(', ')}`,
        err,
      );
    }
    return map;
  }

  private async fetchUserMap(userIds: string[]) {
    const map = new Map<string, any>();
    if (!userIds.length) return map;

    try {
      const response = await this.userClient.getUsersByIds(userIds);
      for (const user of response.users ?? []) {
        map.set(user.id, user);
      }
    } catch (err: any) {
      this.logger.warn(
        `Failed to fetch users for ids ${userIds.join(', ')}`,
        err,
      );
    }
    return map;
  }

  private resolveMediaUrl(
    mediaId: string | undefined,
    mediaMap: Map<string, any>,
  ): string {
    if (!mediaId) return '';

    const media = mediaMap.get(mediaId);
    if (!media) return '';

    const candidate =
      media.mediumUrl ||
      media.originalUrl ||
      media.thumbnailUrl ||
      media.path ||
      '';
    if (!candidate) return '';

    if (/^https?:\/\//i.test(candidate)) {
      return candidate;
    }

    const base = process.env.MEDIA_HTTP_BASE_URL ?? 'http://localhost:4009';
    return `${base.replace(/\/$/, '')}/media/${candidate.replace(/^\/?media\//i, '').replace(/^\/+/, '')}`;
  }
}
