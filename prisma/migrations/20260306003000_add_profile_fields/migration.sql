ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "firstName" VARCHAR(80),
ADD COLUMN IF NOT EXISTS "lastName" VARCHAR(80),
ADD COLUMN IF NOT EXISTS "email" VARCHAR(190),
ADD COLUMN IF NOT EXISTS "phone" VARCHAR(32);

UPDATE "User"
SET
    "firstName" = COALESCE(
        NULLIF(split_part(btrim("name"), ' ', 1), ''),
        'Employee'
    ),
    "lastName" = COALESCE(
        NULLIF(
            btrim(
                CASE
                    WHEN strpos(btrim("name"), ' ') > 0
                        THEN substr(btrim("name"), strpos(btrim("name"), ' ') + 1)
                    ELSE ''
                END
            ),
            ''
        ),
        "employeeId"
    )
WHERE "firstName" IS NULL OR "lastName" IS NULL;

ALTER TABLE "User"
ALTER COLUMN "firstName" SET NOT NULL,
ALTER COLUMN "lastName" SET NOT NULL;

ALTER TABLE "UserSettings"
ADD COLUMN IF NOT EXISTS "timeZone" VARCHAR(64) NOT NULL DEFAULT 'Europe/Copenhagen';
