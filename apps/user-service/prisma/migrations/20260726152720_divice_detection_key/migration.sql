/*
  Warnings:

  - You are about to drop the column `lastActiveAt` on the `user_devices` table. All the data in the column will be lost.
  - You are about to drop the column `pushToken` on the `user_devices` table. All the data in the column will be lost.
  - You are about to drop the column `registeredAt` on the `user_devices` table. All the data in the column will be lost.
  - The `platform` column on the `user_devices` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `fingerprint` on the `user_identity_keys` table. All the data in the column will be lost.
  - You are about to drop the column `consumed` on the `user_one_time_pre_keys` table. All the data in the column will be lost.
  - You are about to drop the column `deviceId` on the `user_one_time_pre_keys` table. All the data in the column will be lost.
  - You are about to drop the column `deviceId` on the `user_signed_pre_keys` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `user_signed_pre_keys` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[deviceRecordId]` on the table `user_identity_keys` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[deviceRecordId,keyId]` on the table `user_one_time_pre_keys` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[deviceRecordId,keyId]` on the table `user_signed_pre_keys` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `user_devices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `deviceRecordId` to the `user_identity_keys` table without a default value. This is not possible if the table is not empty.
  - Added the required column `registrationId` to the `user_identity_keys` table without a default value. This is not possible if the table is not empty.
  - Added the required column `deviceRecordId` to the `user_one_time_pre_keys` table without a default value. This is not possible if the table is not empty.
  - Added the required column `deviceRecordId` to the `user_signed_pre_keys` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DevicePlatform" AS ENUM ('PHONE', 'TABLET', 'LAPTOP', 'DESKTOP', 'WEB', 'OTHER');

-- DropForeignKey
ALTER TABLE "user_identity_keys" DROP CONSTRAINT "user_identity_keys_userId_fkey";

-- DropForeignKey
ALTER TABLE "user_one_time_pre_keys" DROP CONSTRAINT "user_one_time_pre_keys_userId_deviceId_fkey";

-- DropForeignKey
ALTER TABLE "user_signed_pre_keys" DROP CONSTRAINT "user_signed_pre_keys_userId_deviceId_fkey";

-- DropIndex
DROP INDEX "user_devices_userId_idx";

-- DropIndex
DROP INDEX "user_identity_keys_userId_key";

-- DropIndex
DROP INDEX "user_one_time_pre_keys_userId_deviceId_consumed_idx";

-- DropIndex
DROP INDEX "user_one_time_pre_keys_userId_deviceId_keyId_key";

-- DropIndex
DROP INDEX "user_signed_pre_keys_userId_deviceId_key";

-- DropIndex
DROP INDEX "user_signed_pre_keys_userId_idx";

-- AlterTable
ALTER TABLE "user_devices" DROP COLUMN "lastActiveAt",
DROP COLUMN "pushToken",
DROP COLUMN "registeredAt",
ADD COLUMN     "appVersion" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "osVersion" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "deviceName" DROP DEFAULT,
DROP COLUMN "platform",
ADD COLUMN     "platform" "DevicePlatform" NOT NULL DEFAULT 'OTHER';

-- AlterTable
ALTER TABLE "user_identity_keys" DROP COLUMN "fingerprint",
ADD COLUMN     "deviceRecordId" TEXT NOT NULL,
ADD COLUMN     "registrationId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "user_one_time_pre_keys" DROP COLUMN "consumed",
DROP COLUMN "deviceId",
ADD COLUMN     "deviceRecordId" TEXT NOT NULL,
ADD COLUMN     "isUsed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "usedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "user_signed_pre_keys" DROP COLUMN "deviceId",
DROP COLUMN "updatedAt",
ADD COLUMN     "deviceRecordId" TEXT NOT NULL,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "isCurrent" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "user_devices_userId_isActive_idx" ON "user_devices"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "user_identity_keys_deviceRecordId_key" ON "user_identity_keys"("deviceRecordId");

-- CreateIndex
CREATE INDEX "user_one_time_pre_keys_deviceRecordId_isUsed_createdAt_idx" ON "user_one_time_pre_keys"("deviceRecordId", "isUsed", "createdAt");

-- CreateIndex
CREATE INDEX "user_one_time_pre_keys_userId_isUsed_idx" ON "user_one_time_pre_keys"("userId", "isUsed");

-- CreateIndex
CREATE UNIQUE INDEX "user_one_time_pre_keys_deviceRecordId_keyId_key" ON "user_one_time_pre_keys"("deviceRecordId", "keyId");

-- CreateIndex
CREATE INDEX "user_signed_pre_keys_userId_deviceRecordId_isCurrent_idx" ON "user_signed_pre_keys"("userId", "deviceRecordId", "isCurrent");

-- CreateIndex
CREATE UNIQUE INDEX "user_signed_pre_keys_deviceRecordId_keyId_key" ON "user_signed_pre_keys"("deviceRecordId", "keyId");

-- AddForeignKey
ALTER TABLE "user_identity_keys" ADD CONSTRAINT "user_identity_keys_deviceRecordId_fkey" FOREIGN KEY ("deviceRecordId") REFERENCES "user_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_signed_pre_keys" ADD CONSTRAINT "user_signed_pre_keys_deviceRecordId_fkey" FOREIGN KEY ("deviceRecordId") REFERENCES "user_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_one_time_pre_keys" ADD CONSTRAINT "user_one_time_pre_keys_deviceRecordId_fkey" FOREIGN KEY ("deviceRecordId") REFERENCES "user_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
