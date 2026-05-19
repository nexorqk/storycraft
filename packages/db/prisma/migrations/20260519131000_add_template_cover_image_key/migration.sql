ALTER TABLE "Template" ADD COLUMN "coverImageKey" TEXT;

ALTER TABLE "User"
ALTER COLUMN "freeGenerationsPeriodStart"
SET DEFAULT date_trunc('month', CURRENT_TIMESTAMP)::timestamp(3);
