-- AlterTable
ALTER TABLE "BookPage" ADD COLUMN     "templatePageId" UUID;

-- CreateTable
CREATE TABLE "TemplatePage" (
    "id" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "textPrompt" TEXT NOT NULL,
    "illustrationPrompt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplatePage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TemplatePage_templateId_idx" ON "TemplatePage"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "TemplatePage_templateId_pageNumber_key" ON "TemplatePage"("templateId", "pageNumber");

-- CreateIndex
CREATE INDEX "BookPage_templatePageId_idx" ON "BookPage"("templatePageId");

-- AddForeignKey
ALTER TABLE "TemplatePage" ADD CONSTRAINT "TemplatePage_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookPage" ADD CONSTRAINT "BookPage_templatePageId_fkey" FOREIGN KEY ("templatePageId") REFERENCES "TemplatePage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
