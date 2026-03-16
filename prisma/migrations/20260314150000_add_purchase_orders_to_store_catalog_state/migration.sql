ALTER TABLE "StoreCatalogState"
ADD COLUMN "purchaseOrders" JSONB NOT NULL DEFAULT '[]';
