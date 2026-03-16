ALTER TABLE "Store"
ADD COLUMN "defaultCurrency" "Currency" NOT NULL DEFAULT 'EUR',
ADD COLUMN "backupRegionCountry" VARCHAR(120),
ADD COLUMN "unitSystem" VARCHAR(16) NOT NULL DEFAULT 'METRIC',
ADD COLUMN "timeZone" VARCHAR(64) NOT NULL DEFAULT 'Europe/Copenhagen',
ADD COLUMN "productCodePrefix" VARCHAR(12),
ADD COLUMN "productCodeSuffix" VARCHAR(12);
