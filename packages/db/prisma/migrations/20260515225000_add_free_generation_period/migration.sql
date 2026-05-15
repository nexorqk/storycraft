ALTER TABLE "User"
ADD COLUMN "freeGenerationsPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT (date_trunc('month', CURRENT_TIMESTAMP)::timestamp(3));
