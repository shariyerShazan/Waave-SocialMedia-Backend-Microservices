/*
  Warnings:

  - A unique constraint covering the columns `[directKey]` on the table `conversations` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'FILE', 'GIF', 'LOCATION', 'CONTACT', 'SYSTEM', 'SENDER_KEY_DISTRIBUTION');

-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('SENT', 'DELIVERED', 'READ');

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "directKey" TEXT,
ADD COLUMN     "lastMessageAt" TIMESTAMP(3),
ADD COLUMN     "lastMessageId" TEXT,
ADD COLUMN     "lastSenderId" TEXT;

-- CreateTable
CREATE TABLE "conversation_members" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'MEMBER',
    "muted" BOOLEAN NOT NULL DEFAULT false,
    "mutedUntil" TIMESTAMP(3),
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "lastReadMessageId" TEXT,
    "leftAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encrypted_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderDeviceId" TEXT NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "replyToMessageId" TEXT,
    "forwardedFromMessageId" TEXT,
    "clientMessageId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "encrypted_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_envelopes" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "recipientDeviceId" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "ratchetHeader" TEXT,
    "ephemeralKey" TEXT,
    "oneTimePreKeyId" INTEGER,
    "signedPreKeyId" INTEGER,
    "delivered" BOOLEAN NOT NULL DEFAULT false,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_envelopes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encrypted_attachments" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" BIGINT,
    "fileName" TEXT,

    CONSTRAINT "encrypted_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_receipts" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "status" "ReceiptStatus" NOT NULL DEFAULT 'SENT',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_reactions" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pinned_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "pinnedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pinned_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sender_key_distributions" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "senderDeviceId" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "recipientDeviceId" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "ratchetHeader" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sender_key_distributions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversation_members_userId_archived_pinned_idx" ON "conversation_members"("userId", "archived", "pinned");

-- CreateIndex
CREATE INDEX "conversation_members_userId_leftAt_idx" ON "conversation_members"("userId", "leftAt");

-- CreateIndex
CREATE INDEX "conversation_members_conversationId_role_idx" ON "conversation_members"("conversationId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_members_conversationId_userId_key" ON "conversation_members"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "encrypted_messages_conversationId_createdAt_idx" ON "encrypted_messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "encrypted_messages_senderId_createdAt_idx" ON "encrypted_messages"("senderId", "createdAt");

-- CreateIndex
CREATE INDEX "encrypted_messages_conversationId_isDeleted_createdAt_idx" ON "encrypted_messages"("conversationId", "isDeleted", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "encrypted_messages_conversationId_clientMessageId_key" ON "encrypted_messages"("conversationId", "clientMessageId");

-- CreateIndex
CREATE INDEX "message_envelopes_recipientUserId_recipientDeviceId_deliver_idx" ON "message_envelopes"("recipientUserId", "recipientDeviceId", "delivered", "createdAt");

-- CreateIndex
CREATE INDEX "message_envelopes_messageId_idx" ON "message_envelopes"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "message_envelopes_messageId_recipientUserId_recipientDevice_key" ON "message_envelopes"("messageId", "recipientUserId", "recipientDeviceId");

-- CreateIndex
CREATE INDEX "encrypted_attachments_messageId_idx" ON "encrypted_attachments"("messageId");

-- CreateIndex
CREATE INDEX "encrypted_attachments_mediaId_idx" ON "encrypted_attachments"("mediaId");

-- CreateIndex
CREATE INDEX "message_receipts_messageId_status_idx" ON "message_receipts"("messageId", "status");

-- CreateIndex
CREATE INDEX "message_receipts_userId_deviceId_status_idx" ON "message_receipts"("userId", "deviceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "message_receipts_messageId_userId_deviceId_key" ON "message_receipts"("messageId", "userId", "deviceId");

-- CreateIndex
CREATE INDEX "message_reactions_messageId_idx" ON "message_reactions"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "message_reactions_messageId_userId_emoji_key" ON "message_reactions"("messageId", "userId", "emoji");

-- CreateIndex
CREATE INDEX "pinned_messages_conversationId_idx" ON "pinned_messages"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "pinned_messages_conversationId_messageId_key" ON "pinned_messages"("conversationId", "messageId");

-- CreateIndex
CREATE INDEX "sender_key_distributions_conversationId_recipientUserId_rec_idx" ON "sender_key_distributions"("conversationId", "recipientUserId", "recipientDeviceId");

-- CreateIndex
CREATE UNIQUE INDEX "sender_key_distributions_conversationId_senderUserId_sender_key" ON "sender_key_distributions"("conversationId", "senderUserId", "senderDeviceId", "recipientUserId", "recipientDeviceId");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_directKey_key" ON "conversations"("directKey");

-- CreateIndex
CREATE INDEX "conversations_type_lastMessageAt_idx" ON "conversations"("type", "lastMessageAt");

-- CreateIndex
CREATE INDEX "conversations_isDeleted_lastMessageAt_idx" ON "conversations"("isDeleted", "lastMessageAt");

-- AddForeignKey
ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encrypted_messages" ADD CONSTRAINT "encrypted_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_envelopes" ADD CONSTRAINT "message_envelopes_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "encrypted_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encrypted_attachments" ADD CONSTRAINT "encrypted_attachments_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "encrypted_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_receipts" ADD CONSTRAINT "message_receipts_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "encrypted_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "encrypted_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pinned_messages" ADD CONSTRAINT "pinned_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pinned_messages" ADD CONSTRAINT "pinned_messages_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "encrypted_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sender_key_distributions" ADD CONSTRAINT "sender_key_distributions_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
