/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { MediaClient } from '../media/media.client';

@Injectable()
export class MediaEnrichmentService {
  constructor(private readonly mediaClient: MediaClient) {}

  async enrichProfilesWithMedia<T extends Record<string, any>>(
    profiles: T[],
  ): Promise<T[]> {
    // Extract unique media IDs
    const mediaIds = Array.from(
      new Set(
        profiles.flatMap((profile) => {
          const ids = [profile.avatarMediaId, profile.coverMediaId].filter(
            Boolean,
          );
          return ids as string[];
        }),
      ),
    );

    if (!mediaIds.length) {
      return this.formatProfiles(profiles);
    }

    const mediaMap = await this.fetchMediaMap(mediaIds);
    return this.formatProfiles(profiles, mediaMap);
  }

  private async fetchMediaMap(mediaIds: string[]) {
    const mediaMap = new Map<string, any>();

    if (!mediaIds.length) {
      return mediaMap;
    }

    try {
      const response = await this.mediaClient.getMediaByIds(mediaIds);

      if (response?.media) {
        for (const media of response.media) {
          const id = media?.id || (media as any)?._id;
          if (id) {
            mediaMap.set(String(id), media);
          }
        }
      }
    } catch (error) {
      console.warn(
        `Media enrichment failed for ids ${mediaIds.join(', ')}:`,
        error,
      );
    }

    return mediaMap;
  }

  private formatProfiles<T extends Record<string, any>>(
    profiles: T[],
    mediaMap?: Map<string, any>,
  ): T[] {
    return profiles.map((profile) => {
      const avatar = this.resolveMediaUrl(profile.avatarMediaId, mediaMap);
      const coverImg = this.resolveMediaUrl(profile.coverMediaId, mediaMap);

      const formatted = { ...(profile as Record<string, any>) };

      return {
        ...formatted,
        avatar: avatar || profile.avatar || '',
        coverImg: coverImg || profile.coverImg || '',
        birthDate:
          profile.birthDate?.toISOString?.() || profile.birthDate || '',
        createdAt:
          profile.createdAt?.toISOString?.() || profile.createdAt || '',
      } as unknown as T;
    });
  }

  private resolveMediaUrl(
    mediaId: string | null | undefined,
    mediaMap?: Map<string, any>,
  ): string {
    if (!mediaId || !mediaMap) {
      return '';
    }

    const media = mediaMap.get(mediaId);
    if (!media) {
      return '';
    }

    const candidate =
      media.mediumUrl ||
      media.originalUrl ||
      media.thumbnailUrl ||
      media.path ||
      '';
    if (!candidate) {
      return '';
    }

    return this.buildPublicMediaUrl(candidate);
  }

  private buildPublicMediaUrl(relativeUrl: string): string {
    if (typeof relativeUrl !== 'string') {
      return '';
    }

    if (/^https?:\/\//i.test(relativeUrl)) {
      return relativeUrl;
    }

    const baseUrl = process.env.MEDIA_HTTP_BASE_URL || 'http://localhost:4009';
    const normalized = relativeUrl.replace(/^\/+/, '');
    const normalizedPath = normalized.replace(/^media\//i, '');

    return `${baseUrl.replace(/\/$/, '')}/media/${normalizedPath}`;
  }
}
