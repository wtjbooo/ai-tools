-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "icon" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Tool" ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Tool_slug_idx" ON "Tool"("slug");
