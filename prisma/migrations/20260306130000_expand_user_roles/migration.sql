-- Expand roles: ADMIN, MANAGER, EMPLOYEE
-- Map existing USER values to EMPLOYEE.
ALTER TYPE "UserRole" RENAME TO "UserRole_old";

CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'EMPLOYEE');

ALTER TABLE "User"
    ALTER COLUMN "role" DROP DEFAULT,
    ALTER COLUMN "role" TYPE "UserRole" USING (
        CASE
            WHEN "role"::text = 'USER' THEN 'EMPLOYEE'
            ELSE "role"::text
        END
    )::"UserRole",
    ALTER COLUMN "role" SET DEFAULT 'EMPLOYEE';

DROP TYPE "UserRole_old";
