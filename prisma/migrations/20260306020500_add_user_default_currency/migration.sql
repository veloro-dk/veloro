ALTER TABLE "UserSettings"
ADD COLUMN IF NOT EXISTS "defaultCurrency" "Currency" NOT NULL DEFAULT 'EUR';
