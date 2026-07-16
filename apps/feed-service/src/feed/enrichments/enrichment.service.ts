/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/require-await */
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
      return posts.map((post) => {
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
          media: (post.media || []).map((m: any) => ({
            id: m.id || '',
            url: m.url || '',
            mimeType: m.mimeType || '',
            type: m.type || 'IMAGE',
          })),
        };
      });
    } catch (err) {
      this.logger.error('Failed to enrich feed', err);
      return posts;
    }
  }
}
