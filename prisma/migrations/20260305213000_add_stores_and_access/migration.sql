-- CreateTable
CREATE TABLE IF NOT EXISTS "Store" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "UserStoreAccess" (
    "userId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserStoreAccess_pkey" PRIMARY KEY ("userId", "storeId")
);

-- Seed / normalize default store used for backfill
UPDATE "Store"
SET "name" = 'Thompson bicycles',
    "isActive" = true,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'thompson-bicycles';

INSERT INTO "Store" ("id", "name", "slug", "isActive", "createdAt", "updatedAt")
SELECT
    '00000000-0000-0000-0000-000000000001',
    'Thompson bicycles',
    'thompson-bicycles',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1
    FROM "Store"
    WHERE "slug" = 'thompson-bicycles'
);

-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN IF NOT EXISTS "activeStoreId" TEXT;

-- AlterTable
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "storeId" TEXT;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "storeId" TEXT;
ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS "storeId" TEXT;
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "storeId" TEXT;

-- Backfill existing rows to default store
UPDATE "Category"
SET "storeId" = defaults."id"
FROM (SELECT "id" FROM "Store" WHERE "slug" = 'thompson-bicycles' LIMIT 1) AS defaults
WHERE "Category"."storeId" IS NULL;

UPDATE "InventoryItem"
SET "storeId" = defaults."id"
FROM (SELECT "id" FROM "Store" WHERE "slug" = 'thompson-bicycles' LIMIT 1) AS defaults
WHERE "InventoryItem"."storeId" IS NULL;

UPDATE "Purchase"
SET "storeId" = defaults."id"
FROM (SELECT "id" FROM "Store" WHERE "slug" = 'thompson-bicycles' LIMIT 1) AS defaults
WHERE "Purchase"."storeId" IS NULL;

UPDATE "Sale"
SET "storeId" = defaults."id"
FROM (SELECT "id" FROM "Store" WHERE "slug" = 'thompson-bicycles' LIMIT 1) AS defaults
WHERE "Sale"."storeId" IS NULL;

-- Ensure all existing users can access the default store
INSERT INTO "UserStoreAccess" ("userId", "storeId", "createdAt")
SELECT
    "User"."id",
    defaults."id",
    CURRENT_TIMESTAMP
FROM "User"
CROSS JOIN (SELECT "id" FROM "Store" WHERE "slug" = 'thompson-bicycles' LIMIT 1) AS defaults
ON CONFLICT ("userId", "storeId") DO NOTHING;

-- Backfill active store for existing settings
UPDATE "UserSettings"
SET "activeStoreId" = defaults."id"
FROM (SELECT "id" FROM "Store" WHERE "slug" = 'thompson-bicycles' LIMIT 1) AS defaults
WHERE "UserSettings"."activeStoreId" IS NULL;

-- Make new store columns required
ALTER TABLE "Category" ALTER COLUMN "storeId" SET NOT NULL;
ALTER TABLE "InventoryItem" ALTER COLUMN "storeId" SET NOT NULL;
ALTER TABLE "Purchase" ALTER COLUMN "storeId" SET NOT NULL;
ALTER TABLE "Sale" ALTER COLUMN "storeId" SET NOT NULL;

-- Replace old uniqueness with store-scoped uniqueness
DROP INDEX IF EXISTS "Category_name_key";

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Store_name_key" ON "Store"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "Store_slug_key" ON "Store"("slug");
CREATE INDEX IF NOT EXISTS "UserSettings_activeStoreId_idx" ON "UserSettings"("activeStoreId");
CREATE INDEX IF NOT EXISTS "UserStoreAccess_storeId_userId_idx" ON "UserStoreAccess"("storeId", "userId");
CREATE UNIQUE INDEX IF NOT EXISTS "Category_storeId_name_key" ON "Category"("storeId", "name");
CREATE INDEX IF NOT EXISTS "Category_storeId_idx" ON "Category"("storeId");
CREATE INDEX IF NOT EXISTS "InventoryItem_storeId_idx" ON "InventoryItem"("storeId");
CREATE INDEX IF NOT EXISTS "Purchase_storeId_idx" ON "Purchase"("storeId");
CREATE INDEX IF NOT EXISTS "Sale_storeId_idx" ON "Sale"("storeId");

-- AddForeignKey (guarded for partial-apply recovery)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'UserSettings_activeStoreId_fkey'
    ) THEN
        ALTER TABLE "UserSettings"
        ADD CONSTRAINT "UserSettings_activeStoreId_fkey"
        FOREIGN KEY ("activeStoreId") REFERENCES "Store"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'UserStoreAccess_userId_fkey'
    ) THEN
        ALTER TABLE "UserStoreAccess"
        ADD CONSTRAINT "UserStoreAccess_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'UserStoreAccess_storeId_fkey'
    ) THEN
        ALTER TABLE "UserStoreAccess"
        ADD CONSTRAINT "UserStoreAccess_storeId_fkey"
        FOREIGN KEY ("storeId") REFERENCES "Store"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Category_storeId_fkey'
    ) THEN
        ALTER TABLE "Category"
        ADD CONSTRAINT "Category_storeId_fkey"
        FOREIGN KEY ("storeId") REFERENCES "Store"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'InventoryItem_storeId_fkey'
    ) THEN
        ALTER TABLE "InventoryItem"
        ADD CONSTRAINT "InventoryItem_storeId_fkey"
        FOREIGN KEY ("storeId") REFERENCES "Store"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Purchase_storeId_fkey'
    ) THEN
        ALTER TABLE "Purchase"
        ADD CONSTRAINT "Purchase_storeId_fkey"
        FOREIGN KEY ("storeId") REFERENCES "Store"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Sale_storeId_fkey'
    ) THEN
        ALTER TABLE "Sale"
        ADD CONSTRAINT "Sale_storeId_fkey"
        FOREIGN KEY ("storeId") REFERENCES "Store"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
