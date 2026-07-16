/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { MediaGrpcClient } from '@app/clients/clients/media-grpc.clinet';
import { UserGrpcClient } from '@app/clients/clients/user-grpc.client';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ChatEnrichmentService {
  constructor(
    private readonly mediaClient: MediaGrpcClient,
    private readonly userClient: UserGrpcClient,
  ) {}

  async enrichMessages<T extends Record<string, any>>(messages: T[]) {
    const mediaIds = Array.from(
      new Set(messages.flatMap((m) => m.mediaIds ?? [])),
    );

    const userIds = Array.from(
      new Set(messages.map((m) => m.senderId).filter(Boolean)),
    );

    const [mediaMap, userMap] = await Promise.all([
      this.fetchMediaMap(mediaIds),
      this.fetchUserMap(userIds),
    ]);

    return messages.map((message) => ({
      ...message,

      sender: userMap.get(message.senderId) ?? null,

      media: (message.mediaIds ?? [])
        .map((id: string) => {
          const media = mediaMap.get(id);
          if (!media) return null;

          return {
            ...media,
            url: this.resolveMediaUrl(media),
          };
        })
        .filter(Boolean),
    }));
  }

  async enrichConversations<T extends Record<string, any>>(
    conversations: T[],
    currentUserId: string,
  ) {
    const userIds = Array.from(
      new Set(
        conversations.flatMap((c) =>
          c.participants.filter((id: string) => id !== currentUserId),
        ),
      ),
    );

    const userMap = await this.fetchUserMap(userIds);

    return conversations.map((conversation) => {
      if (conversation.type === 'group') {
        return {
          ...conversation,
          members: conversation.participants
            .map((id: string) => userMap.get(id))
            .filter(Boolean),
        };
      }

      const otherId = conversation.participants.find(
        (id: string) => id !== currentUserId,
      );

      return {
        ...conversation,
        user: otherId ? userMap.get(otherId) : null,
      };
    });
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
      console.log(err);
    }

    return map;
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
      console.log(err);
    }

    return map;
  }

  private resolveMediaUrl(media: any) {
    const candidate =
      media.originalUrl || media.thumbnailUrl || media.path || '';

    if (!candidate) return '';

    if (/^https?:\/\//.test(candidate)) {
      return candidate;
    }

    const base = process.env.MEDIA_HTTP_BASE_URL ?? 'http://localhost:4009';

    return `${base}/media/${candidate.replace(/^\/?media\//, '')}`;
  }
}
