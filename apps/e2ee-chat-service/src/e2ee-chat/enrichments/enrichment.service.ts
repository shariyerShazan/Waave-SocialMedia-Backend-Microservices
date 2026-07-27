/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { MediaGrpcClient, UserGrpcClient } from '@app/clients';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class E2eeChatEnrichmentService {
  private readonly logger = new Logger(E2eeChatEnrichmentService.name);

  constructor(
    private readonly mediaClient: MediaGrpcClient,
    private readonly userClient: UserGrpcClient,
  ) {}

  /**
   * Hydrates sender profile + attachment download metadata.
   * Never touches ciphertext / iv / authTag / encryptedKey.
   */
  async enrichMessages<T extends Record<string, any>>(messages: T[]) {
    if (!messages.length) return messages;

    const mediaIds = Array.from(
      new Set(
        messages.flatMap((m) =>
          (m.attachments ?? []).map((a: { mediaId?: string }) => a.mediaId),
        ),
      ),
    ).filter(Boolean) as string[];

    const userIds = Array.from(
      new Set(
        messages
          .flatMap((m) => [m.senderId, m.lastSenderId].filter(Boolean))
          .filter(Boolean),
      ),
    ) as string[];

    const [mediaMap, userMap] = await Promise.all([
      this.fetchMediaMap(mediaIds),
      this.fetchUserMap(userIds),
    ]);

    return messages.map((message) => ({
      ...message,
      sender: userMap.get(message.senderId) ?? null,
      attachments: (message.attachments ?? []).map(
        (attachment: Record<string, any>) => {
          const media = mediaMap.get(attachment.mediaId);
          if (!media) {
            return {
              ...attachment,
              media: null,
            };
          }

          return {
            ...attachment,
            media: {
              ...media,
              url: this.resolveMediaUrl(media),
            },
          };
        },
      ),
    }));
  }

  /**
   * Hydrates conversation list peers / group members.
   * Does not invent plaintext last-message previews.
   */
  async enrichConversations<T extends Record<string, any>>(
    conversations: T[],
    currentUserId: string,
  ) {
    if (!conversations.length) return conversations;

    const userIds = Array.from(
      new Set(
        conversations.flatMap((c) => {
          if (Array.isArray(c.participantIds)) {
            return c.participantIds.filter(
              (id: string) => id && id !== currentUserId,
            );
          }

          if (Array.isArray(c.members)) {
            return c.members
              .map((m: { userId?: string }) => m.userId)
              .filter((id: string | undefined) => id && id !== currentUserId);
          }

          return [];
        }),
      ),
    ) as string[];

    const userMap = await this.fetchUserMap(userIds);

    return conversations.map((conversation) => {
      const type = String(conversation.type || '').toUpperCase();
      const participantIds: string[] = Array.isArray(
        conversation.participantIds,
      )
        ? conversation.participantIds
        : Array.isArray(conversation.members)
          ? conversation.members
              .map((m: { userId?: string }) => m.userId)
              .filter(Boolean)
          : [];

      if (type === 'GROUP') {
        const members = participantIds
          .map((id) => userMap.get(id))
          .filter(Boolean);

        const enrichedMembers = Array.isArray(conversation.members)
          ? conversation.members.map((member: Record<string, any>) => ({
              ...member,
              user: userMap.get(member.userId) ?? null,
            }))
          : members;

        return {
          ...conversation,
          members: enrichedMembers,
        };
      }

      const otherId = participantIds.find((id) => id !== currentUserId);

      return {
        ...conversation,
        user: otherId ? (userMap.get(otherId) ?? null) : null,
        members: Array.isArray(conversation.members)
          ? conversation.members.map((member: Record<string, any>) => ({
              ...member,
              user: userMap.get(member.userId) ?? null,
            }))
          : conversation.members,
      };
    });
  }

  async enrichConversation<T extends Record<string, any>>(
    conversation: T,
    currentUserId: string,
  ): Promise<T> {
    const [enriched] = await this.enrichConversations(
      [conversation],
      currentUserId,
    );
    return enriched;
  }

  async enrichMessage<T extends Record<string, any>>(message: T): Promise<T> {
    const [enriched] = await this.enrichMessages([message]);
    return enriched;
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
      this.logger.warn(`Failed to enrich users: ${err?.message ?? err}`);
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
      this.logger.warn(`Failed to enrich media: ${err?.message ?? err}`);
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
