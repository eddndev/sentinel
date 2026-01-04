-- CreateEnum
CREATE TYPE "TriggerScope" AS ENUM ('INCOMING', 'OUTGOING', 'BOTH');

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "fromMe" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Trigger" ADD COLUMN     "scope" "TriggerScope" NOT NULL DEFAULT 'INCOMING';
