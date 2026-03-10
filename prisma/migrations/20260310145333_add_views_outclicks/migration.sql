-- AlterTable
ALTER TABLE "Tool" ADD COLUMN     "outClicks" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "views" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ToolViewEvent" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "sessionKey" TEXT NOT NULL,
    "dayBucket" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolViewEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToolOutClickEvent" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "sessionKey" TEXT,
    "targetUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolOutClickEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ToolViewEvent_toolId_createdAt_idx" ON "ToolViewEvent"("toolId", "createdAt");

-- CreateIndex
CREATE INDEX "ToolViewEvent_createdAt_idx" ON "ToolViewEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ToolViewEvent_toolId_sessionKey_dayBucket_key" ON "ToolViewEvent"("toolId", "sessionKey", "dayBucket");

-- CreateIndex
CREATE INDEX "ToolOutClickEvent_toolId_createdAt_idx" ON "ToolOutClickEvent"("toolId", "createdAt");

-- CreateIndex
CREATE INDEX "ToolOutClickEvent_createdAt_idx" ON "ToolOutClickEvent"("createdAt");

-- CreateIndex
CREATE INDEX "Tool_views_idx" ON "Tool"("views");

-- CreateIndex
CREATE INDEX "Tool_outClicks_idx" ON "Tool"("outClicks");

-- AddForeignKey
ALTER TABLE "ToolViewEvent" ADD CONSTRAINT "ToolViewEvent_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolOutClickEvent" ADD CONSTRAINT "ToolOutClickEvent_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;
