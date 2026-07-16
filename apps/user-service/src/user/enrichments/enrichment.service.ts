/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { MediaGrpcClient } from '@app/clients';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class UserEnrichmentService {
  private readonly logger = new Logger(UserEnrichmentService.name);

  constructor(
    private readonly mediaClient: MediaGrpcClient,
  ) {}

  async enrichProfilesWithMedia<T extends Record<string, any>>(
    profiles: T[],
  ): Promise<T[]> {
    if (!profiles.length) return [];

    try {
      const mediaIds = Array.from(
        new Set(
          profiles
            .flatMap((p) => [p.avatarMediaId, p.coverMediaId])
            .filter(Boolean),
        ),
      );

      const mediaMap = new Map<string, any>();
      if (mediaIds.length > 0) {
        const response = await this.mediaClient.getMediaByIds(mediaIds);
        for (const media of response.media ?? []) {
          mediaMap.set(media.id, media);
        }
      }

      return profiles.map((profile) => {
        const avatarMedia = profile.avatarMediaId ? mediaMap.get(profile.avatarMediaId) : null;
        const coverMedia = profile.coverMediaId ? mediaMap.get(profile.coverMediaId) : null;

        const avatar = avatarMedia
          ? {
              id: avatarMedia.id,
              url: this.resolveMediaUrl(profile.avatarMediaId, mediaMap),
              mimeType: avatarMedia.mimeType || '',
              type: avatarMedia.type ? String(avatarMedia.type) : 'IMAGE',
            }
          : null;

        const coverImg = coverMedia
          ? {
              id: coverMedia.id,
              url: this.resolveMediaUrl(profile.coverMediaId, mediaMap),
              mimeType: coverMedia.mimeType || '',
              type: coverMedia.type ? String(coverMedia.type) : 'IMAGE',
            }
          : null;

        return {
          ...profile,
          avatar,
          coverImg,
          birthDate: this.formatDate(profile.birthDate),
          createdAt: this.formatDate(profile.createdAt),
          location: profile.location || '',
          website: profile.website || '',
          bio: profile.bio || '',
        };
      });
    } catch (err) {
      this.logger.error('Failed to enrich profiles with media', err);
      return profiles.map((profile) => ({
        ...profile,
        avatar: null,
        coverImg: null,
        birthDate: this.formatDate(profile.birthDate),
        createdAt: this.formatDate(profile.createdAt),
        location: profile.location || '',
        website: profile.website || '',
        bio: profile.bio || '',
      }));
    }
  }

  private resolveMediaUrl(
    mediaId: string | null | undefined,
    mediaMap: Map<string, any>,
  ): string {
    if (!mediaId) return '';

    const media = mediaMap.get(mediaId);
    if (!media) return '';

    const path =
      media.mediumUrl || media.originalUrl || media.thumbnailUrl || media.path;

    if (!path) return '';

    return this.buildPublicMediaUrl(path);
  }

  private buildPublicMediaUrl(path: string) {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }

    const base = process.env.MEDIA_HTTP_BASE_URL || 'http://localhost:4009';
    return `${base.replace(/\/$/, '')}/media/${path.replace(/^\/?media\//, '')}`;
  }

  private formatDate(value: unknown): string {
    if (!value && value !== 0) {
      return '';
    }

    if (typeof value === 'string') {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? value : date.toISOString();
    }

    if (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as { toISOString?: unknown }).toISOString === 'function'
    ) {
      return (value as { toISOString: () => string }).toISOString();
    }

    return '';
  }
}
