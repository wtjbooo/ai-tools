-- AlterTable
ALTER TABLE "ReversePromptTask" ALTER COLUMN "normalizedResultJson" SET DEFAULT '{}',
ALTER COLUMN "resultJson" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "freeUsesToday" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isPro" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastUsedDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverUrl" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'website',
    "tags" TEXT NOT NULL DEFAULT '',
    "metaJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Collection_userId_idx" ON "Collection"("userId");

-- CreateIndex
CREATE INDEX "Collection_platform_idx" ON "Collection"("platform");

-- CreateIndex
CREATE INDEX "Collection_createdAt_idx" ON "Collection"("createdAt");

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
