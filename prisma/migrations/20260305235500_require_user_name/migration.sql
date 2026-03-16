WITH first_admin AS (
    SELECT "id"
    FROM "User"
    WHERE "role" = 'ADMIN'
    ORDER BY "createdAt" ASC
    LIMIT 1
)
UPDATE "User" AS u
SET "name" = 'Lucas Thompson'
FROM first_admin
WHERE u."id" = first_admin."id"
  AND (u."name" IS NULL OR btrim(u."name") = '');

UPDATE "User"
SET "name" = 'Employee ' || "employeeId"
WHERE "name" IS NULL OR btrim("name") = '';

ALTER TABLE "User"
ALTER COLUMN "name" SET NOT NULL;
