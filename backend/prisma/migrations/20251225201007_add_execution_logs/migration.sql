/*
  Warnings:

  - You are about to drop the column `cooldownMs` on the `Trigger` table. All the data in the column will be lost.
  - You are about to drop the column `usageLimit` on the `Trigger` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Execution" ADD COLUMN     "error" TEXT,
ADD COLUMN     "trigger" TEXT;

-- AlterTable
ALTER TABLE "Flow" ADD COLUMN     "cooldownMs" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "usageLimit" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Trigger" DROP COLUMN "cooldownMs",
DROP COLUMN "usageLimit";
