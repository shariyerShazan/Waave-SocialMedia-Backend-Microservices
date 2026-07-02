import { MediaStatus, MediaType } from '@app/common';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MediaDocument = HydratedDocument<Media>;

@Schema({
  timestamps: true,
  collection: 'media',
  toObject: { virtuals: true },
  toJSON: { virtuals: true },
})
export class Media {
  @Prop({
    required: true,
    index: true,
  })
  userId: string;

  @Prop({
    type: String,
    enum: MediaType,
    required: true,
    index: true,
  })
  type: MediaType;

  @Prop({
    required: true,
  })
  originalName: string;

  @Prop({
    required: true,
  })
  fileName: string;

  @Prop({
    required: true,
  })
  path: string;

  @Prop({
    default: '',
  })
  originalUrl: string;

  @Prop({
    default: '',
  })
  thumbnailUrl: string;

  @Prop({
    default: '',
  })
  mediumUrl: string;

  @Prop({
    required: true,
  })
  mimeType: string;

  @Prop({
    required: true,
  })
  size: number;

  @Prop({
    type: String,
    enum: MediaStatus,
    default: MediaStatus.PENDING,
    index: true,
  })
  status: MediaStatus;

  @Prop({
    default: 0,
  })
  width: number;

  @Prop({
    default: 0,
  })
  height: number;

  @Prop({
    default: 0,
  })
  duration: number;

  @Prop({
    default: false,
    index: true,
  })
  isDeleted: boolean;

  @Prop({
    type: Date,
    default: null,
  })
  deletedAt: Date | null;
}

export const MediaSchema = SchemaFactory.createForClass(Media);

/**
 * Indexes
 */

MediaSchema.index({
  userId: 1,
  createdAt: -1,
});

MediaSchema.index({
  userId: 1,
  type: 1,
});

MediaSchema.index({
  status: 1,
});

MediaSchema.index({
  isDeleted: 1,
});

MediaSchema.index({
  createdAt: -1,
});
