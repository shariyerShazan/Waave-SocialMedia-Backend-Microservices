/*
  Warnings:

  - You are about to drop the column `mediaUrls` on the `posts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "posts" DROP COLUMN "mediaUrls",
ADD COLUMN     "mediaIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
