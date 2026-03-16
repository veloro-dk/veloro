CREATE TABLE "StoreCatalogState" (
    "storeId" TEXT NOT NULL,
    "variantDefinitions" JSONB NOT NULL DEFAULT '[]',
    "categoryDefinitions" JSONB NOT NULL DEFAULT '[]',
    "products" JSONB NOT NULL DEFAULT '[]',
    "inventoryBatches" JSONB NOT NULL DEFAULT '[]',
    "inventorySales" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreCatalogState_pkey" PRIMARY KEY ("storeId")
);

ALTER TABLE "StoreCatalogState"
ADD CONSTRAINT "StoreCatalogState_storeId_fkey"
FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
