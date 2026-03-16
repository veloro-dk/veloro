ALTER TABLE "UserSettings"
ADD COLUMN IF NOT EXISTS "defaultTimeZone" VARCHAR(64) NOT NULL DEFAULT 'Europe/Copenhagen';
