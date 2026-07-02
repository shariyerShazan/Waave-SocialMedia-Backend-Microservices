/*
  Warnings:

  - You are about to drop the column `avatar` on the `profiles` table. All the data in the column will be lost.
  - You are about to drop the column `coverImg` on the `profiles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "profiles" DROP COLUMN "avatar",
DROP COLUMN "coverImg",
ADD COLUMN     "avatarMediaId" TEXT,
ADD COLUMN     "coverMediaId" TEXT;
