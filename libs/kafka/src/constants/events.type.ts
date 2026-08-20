import { E2eeMemberRole } from '@app/common';

export interface UserRegisteredEvent {
  userId: string;
  email: string;
  name: string;
}

export interface SendRegistrationOtpEvent {
  email: string;
  name: string;
  otp: string;
}

export interface SendResetPassOtpEvent {
  email: string;
  name: string;
  otp: string;
}

export interface UserFollowEvent {
  followerId: string;
  targetId: string;
  followerName: string;
}

export interface UserUnfollowEvent {
  followerId: string;
  targetId: string;
  followerName: string;
}

export interface PostCreatedEvent {
  postId: string;
  userId: string;
  content: string;
  mediaIds: string[];
  privacy: string;
}

export interface PostDeleteEvent {
  postId: string;
  userId: string;
}

export interface PostLikedEvent {
  postId: string;
  userId: string;
  authorId: string;
}

export interface PostCommentEvent {
  postId: string;
  commentId: string;
  userId: string;
  authorId: string;
  text: string;
  parentId: string | undefined;
}

export interface PostSharedEvent {
  postId: string;
  userId: string;
  authorId: string;
  shareId: string;
}

export interface GroupCreatedEvent {
  conversationId: string;
  groupName: string;
  creatorId: string;
  participantIds: string[];
  avatar?: string;
}

export interface GroupMemberAddedEvent {
  conversationId: string;
  groupName: string;
  userId: string;
  addedBy: string;
  role: E2eeMemberRole;
}

export interface GroupMemberRemovedEvent {
  conversationId: string;
  groupName: string;
  userId: string;
  removedBy: string;
}

export interface GroupMemberLeftEvent {
  conversationId: string;
  groupName: string;
  userId: string;
}

export interface EncryptedMessageSentEvent {
  conversationId: string;
  messageId: string;
  senderId: string;
  senderDeviceId: string;
  messageType: string;
}

export interface MessageSentEvent {
  conversationId: string;
  messageId: string;
  senderId: string;
  messageType: string;
  text?: string;
}
