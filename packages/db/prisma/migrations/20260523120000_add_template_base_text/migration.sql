-- AlterTable
ALTER TABLE "Book" ADD COLUMN     "personalization" JSONB;

-- AlterTable
ALTER TABLE "TemplatePage" ADD COLUMN     "baseText" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "illustrationPromptBase" TEXT,
ADD COLUMN     "sceneDescription" TEXT,
ADD COLUMN     "personalizationSlots" JSONB;

-- Backfill no-AI template text from existing prompt fields for compatibility.
UPDATE "TemplatePage"
SET "baseText" = "textPrompt",
    "illustrationPromptBase" = "illustrationPrompt"
WHERE "baseText" = '';
