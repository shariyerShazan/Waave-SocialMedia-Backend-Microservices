/*
  Warnings:

  - The `privacy` column on the `posts` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "PostPrivacy" AS ENUM ('PUBLIC', 'FRIENDS', 'PRIVATE');

-- AlterTable
ALTER TABLE "posts" DROP COLUMN "privacy",
ADD COLUMN     "privacy" "PostPrivacy" NOT NULL DEFAULT 'PUBLIC';

-- DropEnum
DROP TYPE "Privacy";
