/*
  Warnings:

  - Added the required column `botId` to the `Client` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "botId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Client_botId_idx" ON "Client"("botId");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
