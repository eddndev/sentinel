/*
  Warnings:

  - You are about to drop the column `userId` on the `Bot` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Bot" DROP CONSTRAINT "Bot_userId_fkey";

-- AlterTable
ALTER TABLE "Bot" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role";

-- DropEnum
DROP TYPE "Role";
