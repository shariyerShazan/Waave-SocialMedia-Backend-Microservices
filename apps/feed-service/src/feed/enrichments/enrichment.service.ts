/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { MediaGrpcClient } from '@app/clients/clients/media-grpc.clinet';
import { UserGrpcClient } from '@app/clients/clients/user-grpc.client';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class FeedEnrichmentService {
  private readonly logger = new Logger(FeedEnrichmentService.name);

  constructor(
    private readonly userClient: UserGrpcClient,
    private readonly mediaClient: MediaGrpcClient,
  ) {}

  async enrichPosts<T extends Record<string, any>>(posts: T[]): Promise<any[]> {
    if (!posts.length) return [];

    try {
      const allMediaIds = Array.from(
        new Set(
          posts.flatMap((p) => (p.mediaIds ?? []) as string[]).filter(Boolean),
        ),
      );

      const mediaMap = await this.fetchMediaMap(allMediaIds);

      return posts.map((post) => {
        const mediaIds: string[] = post.mediaIds ?? [];
        const resolvedMedia = mediaIds
          .map((id: string) => {
            const m = mediaMap.get(id);
            if (!m) return null;
            return {
              id: m.id,
              url: this.resolveMediaUrl(id, mediaMap),
              mimeType: m.mimeType || '',
              type: m.type ? String(m.type) : 'IMAGE',
            };
          })
          .filter(Boolean);

        const media =
          resolvedMedia.length > 0
            ? resolvedMedia
            : (post.media || []).map((m: any) => ({
                id: m.id || '',
                url: m.url || '',
                mimeType: m.mimeType || '',
                type: m.type || 'IMAGE',
              }));

        return {
          id: post.id,
          content: post.content || '',
          feeling: post.feeling || '',
          location: post.location || '',
          likesCount: post.likesCount ?? 0,
          commentsCount: post.commentsCount ?? 0,
          sharesCount: post.sharesCount ?? 0,
          viewsCount: post.viewsCount ?? 0,
          isLiked: post.isLiked ?? false,
          isBookmarked: post.isBookmarked ?? false,
          createdAt: post.createdAt || '',
          author: post.author
            ? {
                id: post.author.id,
                username: post.author.username || '',
                fullName: post.author.fullName || '',
                avatar: post.author.avatar || '',
                verified: post.author.verified ?? false,
              }
            : null,
          media,
        };
      });
    } catch (err) {
      this.logger.error('Failed to enrich feed', err);
      return posts;
    }
  }

  // ── Fetch media map by IDs ─────────────────────────────────────────
  private async fetchMediaMap(mediaIds: string[]): Promise<Map<string, any>> {
    const map = new Map<string, any>();
    if (!mediaIds.length) return map;

    try {
      const response = await this.mediaClient.getMediaByIds(mediaIds);
      for (const m of response.media ?? []) {
        map.set(m.id, m);
      }
    } catch (err: any) {
      this.logger.warn(
        `Feed enrichment: failed to fetch media [${mediaIds.join(', ')}]`,
        err,
      );
    }

    return map;
  }

  // ── Resolve a full URL from the media record ───────────────────────
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
    return `${base.replace(/\/$/, '')}/media/${candidate
      .replace(/^\/?(media\/)/i, '')
      .replace(/^\/+/, '')}`;
  }
}
