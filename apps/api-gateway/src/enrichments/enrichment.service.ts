/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { MediaClient } from '../media/media.client';
import { UserClient } from '../user/user.client';

@Injectable()
export class EnrichmentService {
  constructor(
    private readonly mediaClient: MediaClient,
    private readonly userClient: UserClient,
  ) {}

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

  async enrichPostsWithMedia<T extends Record<string, any>>(
    posts: T[],
  ): Promise<T[]> {
    const mediaIds = Array.from(
      new Set(
        posts.flatMap((post) => {
          if (!Array.isArray(post.mediaIds)) {
            return [];
          }

          return post.mediaIds.filter(Boolean);
        }),
      ),
    );

    if (!mediaIds.length) {
      return posts.map((post) => ({
        ...post,
        media: [],
      }));
    }

    const mediaMap = await this.fetchMediaMap(mediaIds);

    return posts.map((post) => ({
      ...post,
      media: (post.mediaIds || [])
        .map((id: string) => {
          const media = mediaMap.get(id);

          if (!media) {
            return null;
          }

          return {
            ...media,
            url: this.resolveMediaUrl(id, mediaMap),
          };
        })
        .filter(Boolean),
    }));
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

  private async fetchUserMap(userIds: string[], requesterId: string) {
    const map = new Map<string, any>();

    await Promise.all(
      userIds.map(async (id) => {
        try {
          const response = await this.userClient.getProfile(id, requesterId);

          if (response?.user) {
            map.set(id, response.user);
          }
        } catch (error) {
          console.warn(
            `Media enrichment failed for ids ${userIds.join(', ')}:`,
            error,
          );
        }
      }),
    );

    return map;
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

  async enrichPostsWithAuthor<T extends Record<string, any>>(
    posts: T[],
    requesterId = '',
  ): Promise<T[]> {
    const userIds = Array.from(
      new Set(posts.map((post) => post.userId).filter(Boolean)),
    );

    if (!userIds.length) {
      return posts;
    }

    const userMap = new Map<string, any>();

    await Promise.all(
      userIds.map(async (userId) => {
        try {
          const response = await this.userClient.getProfile(
            userId,
            requesterId,
          );

          if (response?.user) {
            userMap.set(userId, response.user);
          }
        } catch {
          // Ignore failed user
        }
      }),
    );

    return posts.map((post) => {
      const user = userMap.get(post.userId);

      return {
        ...post,

        author: user
          ? {
              id: user.id,
              username: user.username,
              fullName: user.fullName,
              avatar: user.avatar,
              verified: user.verified,
            }
          : null,
      };
    });
  }

  async enrichPosts<T extends Record<string, any>>(
    posts: T[],
    requesterId: string,
  ): Promise<T[]> {
    const mediaIds = Array.from(
      new Set(posts.flatMap((post) => post.mediaIds ?? [])),
    );

    const userIds = Array.from(
      new Set(posts.map((post) => post.userId).filter(Boolean)),
    );

    const [mediaMap, userMap] = await Promise.all([
      this.fetchMediaMap(mediaIds),
      this.fetchUserMap(userIds, requesterId),
    ]);

    return posts.map((post) => ({
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

      author: userMap.get(post.userId) ?? null,
    }));
  }

  async enrichPostWithAuthor<T extends Record<string, any>>(
    post: T,
    requesterId = '',
  ): Promise<T> {
    const [result] = await this.enrichPostsWithAuthor([post], requesterId);

    return result;
  }
}
