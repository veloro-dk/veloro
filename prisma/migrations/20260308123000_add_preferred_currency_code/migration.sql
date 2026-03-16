ALTER TABLE "UserSettings"
ADD COLUMN IF NOT EXISTS "preferredCurrencyCode" VARCHAR(3);
