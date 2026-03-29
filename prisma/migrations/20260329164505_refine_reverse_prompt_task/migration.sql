-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "convertedToolId" TEXT,
ADD COLUMN     "needsManualReview" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "qualityScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rejectReason" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "reviewNotes" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedBy" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "sourceType" TEXT NOT NULL DEFAULT 'submission',
ADD COLUMN     "suggestedCategory" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "suggestedTags" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "websiteNormalized" TEXT;

-- AlterTable
ALTER TABLE "Tool" ADD COLUMN     "categoryConfidence" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "classificationStatus" TEXT NOT NULL DEFAULT 'unknown',
ADD COLUMN     "contentQualityStatus" TEXT NOT NULL DEFAULT 'unknown',
ADD COLUMN     "importedAt" TIMESTAMP(3),
ADD COLUMN     "needsContentRewrite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "needsManualReview" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "normalizedWebsite" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "qualityScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rejectReason" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "reviewNotes" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "reviewStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedBy" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "sourceType" TEXT NOT NULL DEFAULT 'import',
ADD COLUMN     "sourceUrl" TEXT,
ADD COLUMN     "tagConfidence" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "isPublished" SET DEFAULT false;

-- CreateTable
CREATE TABLE "ReversePromptTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "inputType" TEXT NOT NULL DEFAULT 'images',
    "sourceCount" INTEGER NOT NULL DEFAULT 0,
    "inputUrls" TEXT NOT NULL DEFAULT '[]',
    "outputLanguage" TEXT NOT NULL DEFAULT 'zh',
    "outputStyle" TEXT NOT NULL DEFAULT 'standard',
    "targetPlatform" TEXT NOT NULL DEFAULT 'generic',
    "model" TEXT NOT NULL DEFAULT '',
    "metaJson" TEXT NOT NULL DEFAULT '{}',
    "rawResponseText" TEXT NOT NULL DEFAULT '',
    "rawResultJson" TEXT NOT NULL DEFAULT '',
    "normalizedResultJson" TEXT NOT NULL DEFAULT '',
    "resultJson" TEXT NOT NULL DEFAULT '',
    "errorMessage" TEXT NOT NULL DEFAULT '',
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReversePromptTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReversePromptTask_status_createdAt_idx" ON "ReversePromptTask"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ReversePromptTask_inputType_createdAt_idx" ON "ReversePromptTask"("inputType", "createdAt");

-- CreateIndex
CREATE INDEX "ReversePromptTask_userId_createdAt_idx" ON "ReversePromptTask"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ReversePromptTask_createdAt_idx" ON "ReversePromptTask"("createdAt");

-- CreateIndex
CREATE INDEX "Submission_status_createdAt_idx" ON "Submission"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Submission_websiteNormalized_idx" ON "Submission"("websiteNormalized");

-- CreateIndex
CREATE INDEX "Submission_convertedToolId_idx" ON "Submission"("convertedToolId");

-- CreateIndex
CREATE INDEX "Tool_isPublished_reviewStatus_idx" ON "Tool"("isPublished", "reviewStatus");

-- CreateIndex
CREATE INDEX "Tool_reviewStatus_createdAt_idx" ON "Tool"("reviewStatus", "createdAt");

-- CreateIndex
CREATE INDEX "Tool_contentQualityStatus_createdAt_idx" ON "Tool"("contentQualityStatus", "createdAt");

-- CreateIndex
CREATE INDEX "Tool_classificationStatus_createdAt_idx" ON "Tool"("classificationStatus", "createdAt");

-- CreateIndex
CREATE INDEX "Tool_qualityScore_idx" ON "Tool"("qualityScore");

-- CreateIndex
CREATE INDEX "Tool_categoryId_reviewStatus_idx" ON "Tool"("categoryId", "reviewStatus");

-- CreateIndex
CREATE INDEX "Tool_featured_featuredOrder_idx" ON "Tool"("featured", "featuredOrder");
