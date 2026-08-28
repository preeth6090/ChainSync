-- Multi-firm retrofit. Hand-written (not `prisma migrate dev`-generated) because every new
-- companyId column is required (NOT NULL) on tables that already hold data — Prisma refuses
-- to auto-generate that as a single step. This migration is safe on existing data because,
-- at the time it was written, there is exactly one CompanyProfile row, so every backfill
-- below unambiguously assigns existing rows to that one firm.

-- 1. New membership table: which firms a user can access.
CREATE TABLE "UserFirm" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFirm_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserFirm_userId_companyId_key" ON "UserFirm"("userId", "companyId");
CREATE INDEX "UserFirm_companyId_idx" ON "UserFirm"("companyId");

ALTER TABLE "UserFirm" ADD CONSTRAINT "UserFirm_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserFirm" ADD CONSTRAINT "UserFirm_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CompanyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Every existing user gets access to the one existing firm, as their default — otherwise this
-- migration would silently lock everyone out of their own data the moment firm-scoping ships.
INSERT INTO "UserFirm" ("id", "userId", "companyId", "isDefault")
SELECT gen_random_uuid()::text, "id", (SELECT "id" FROM "CompanyProfile" LIMIT 1), true
FROM "User";

-- 2. companyId on every aggregate-root table, in 4 steps each: add nullable, backfill, make
-- required, add the FK. Kept as one explicit block per table rather than a loop so each step
-- is independently reviewable and re-runnable.

-- Category
ALTER TABLE "Category" ADD COLUMN "companyId" TEXT;
UPDATE "Category" SET "companyId" = (SELECT "id" FROM "CompanyProfile" LIMIT 1) WHERE "companyId" IS NULL;
ALTER TABLE "Category" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Category" ADD CONSTRAINT "Category_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CompanyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
DROP INDEX "Category_slug_key";
CREATE UNIQUE INDEX "Category_companyId_slug_key" ON "Category"("companyId", "slug");
CREATE INDEX "Category_companyId_idx" ON "Category"("companyId");

-- Product
ALTER TABLE "Product" ADD COLUMN "companyId" TEXT;
UPDATE "Product" SET "companyId" = (SELECT "id" FROM "CompanyProfile" LIMIT 1) WHERE "companyId" IS NULL;
ALTER TABLE "Product" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Product" ADD CONSTRAINT "Product_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CompanyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
DROP INDEX "Product_sku_key";
CREATE UNIQUE INDEX "Product_companyId_sku_key" ON "Product"("companyId", "sku");
CREATE INDEX "Product_companyId_idx" ON "Product"("companyId");

-- Customer
ALTER TABLE "Customer" ADD COLUMN "companyId" TEXT;
UPDATE "Customer" SET "companyId" = (SELECT "id" FROM "CompanyProfile" LIMIT 1) WHERE "companyId" IS NULL;
ALTER TABLE "Customer" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CompanyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Customer_companyId_idx" ON "Customer"("companyId");

-- Vendor
ALTER TABLE "Vendor" ADD COLUMN "companyId" TEXT;
UPDATE "Vendor" SET "companyId" = (SELECT "id" FROM "CompanyProfile" LIMIT 1) WHERE "companyId" IS NULL;
ALTER TABLE "Vendor" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CompanyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
DROP INDEX "Vendor_phone_key";
CREATE UNIQUE INDEX "Vendor_companyId_phone_key" ON "Vendor"("companyId", "phone");
CREATE INDEX "Vendor_companyId_idx" ON "Vendor"("companyId");

-- Warehouse
ALTER TABLE "Warehouse" ADD COLUMN "companyId" TEXT;
UPDATE "Warehouse" SET "companyId" = (SELECT "id" FROM "CompanyProfile" LIMIT 1) WHERE "companyId" IS NULL;
ALTER TABLE "Warehouse" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CompanyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
DROP INDEX "Warehouse_code_key";
CREATE UNIQUE INDEX "Warehouse_companyId_code_key" ON "Warehouse"("companyId", "code");

-- Order
ALTER TABLE "Order" ADD COLUMN "companyId" TEXT;
UPDATE "Order" SET "companyId" = (SELECT "id" FROM "CompanyProfile" LIMIT 1) WHERE "companyId" IS NULL;
ALTER TABLE "Order" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Order" ADD CONSTRAINT "Order_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CompanyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
DROP INDEX "Order_orderNumber_key";
CREATE UNIQUE INDEX "Order_companyId_orderNumber_key" ON "Order"("companyId", "orderNumber");
CREATE INDEX "Order_companyId_idx" ON "Order"("companyId");

-- PurchaseOrder
ALTER TABLE "PurchaseOrder" ADD COLUMN "companyId" TEXT;
UPDATE "PurchaseOrder" SET "companyId" = (SELECT "id" FROM "CompanyProfile" LIMIT 1) WHERE "companyId" IS NULL;
ALTER TABLE "PurchaseOrder" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CompanyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
DROP INDEX "PurchaseOrder_poNumber_key";
CREATE UNIQUE INDEX "PurchaseOrder_companyId_poNumber_key" ON "PurchaseOrder"("companyId", "poNumber");
CREATE INDEX "PurchaseOrder_companyId_idx" ON "PurchaseOrder"("companyId");

-- Quotation
ALTER TABLE "Quotation" ADD COLUMN "companyId" TEXT;
UPDATE "Quotation" SET "companyId" = (SELECT "id" FROM "CompanyProfile" LIMIT 1) WHERE "companyId" IS NULL;
ALTER TABLE "Quotation" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CompanyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
DROP INDEX "Quotation_quotationNumber_key";
CREATE UNIQUE INDEX "Quotation_companyId_quotationNumber_key" ON "Quotation"("companyId", "quotationNumber");
CREATE INDEX "Quotation_companyId_idx" ON "Quotation"("companyId");

-- Expense
ALTER TABLE "Expense" ADD COLUMN "companyId" TEXT;
UPDATE "Expense" SET "companyId" = (SELECT "id" FROM "CompanyProfile" LIMIT 1) WHERE "companyId" IS NULL;
ALTER TABLE "Expense" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CompanyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Expense_companyId_idx" ON "Expense"("companyId");

-- Invoice
ALTER TABLE "Invoice" ADD COLUMN "companyId" TEXT;
UPDATE "Invoice" SET "companyId" = (SELECT "id" FROM "CompanyProfile" LIMIT 1) WHERE "companyId" IS NULL;
ALTER TABLE "Invoice" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CompanyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
DROP INDEX "Invoice_invoiceNumber_key";
CREATE UNIQUE INDEX "Invoice_companyId_invoiceNumber_key" ON "Invoice"("companyId", "invoiceNumber");
CREATE INDEX "Invoice_companyId_idx" ON "Invoice"("companyId");

-- InvoiceSequence
ALTER TABLE "InvoiceSequence" ADD COLUMN "companyId" TEXT;
UPDATE "InvoiceSequence" SET "companyId" = (SELECT "id" FROM "CompanyProfile" LIMIT 1) WHERE "companyId" IS NULL;
ALTER TABLE "InvoiceSequence" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "InvoiceSequence" ADD CONSTRAINT "InvoiceSequence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CompanyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
DROP INDEX "InvoiceSequence_financialYear_key";
CREATE UNIQUE INDEX "InvoiceSequence_companyId_financialYear_key" ON "InvoiceSequence"("companyId", "financialYear");

-- ApprovalConfig
ALTER TABLE "ApprovalConfig" ADD COLUMN "companyId" TEXT;
UPDATE "ApprovalConfig" SET "companyId" = (SELECT "id" FROM "CompanyProfile" LIMIT 1) WHERE "companyId" IS NULL;
ALTER TABLE "ApprovalConfig" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "ApprovalConfig" ADD CONSTRAINT "ApprovalConfig_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CompanyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "ApprovalConfig_companyId_idx" ON "ApprovalConfig"("companyId");
