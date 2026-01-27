-- AlterTable
ALTER TABLE "Flow" ADD COLUMN     "excludesFlows" TEXT[] DEFAULT ARRAY[]::TEXT[];
