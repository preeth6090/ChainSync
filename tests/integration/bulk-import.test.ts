import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/prisma';
import { buildItemsTemplate, importItemsFromWorkbook, ITEMS_TEMPLATE_HEADERS } from '@/lib/services/bulk-import';
import { hasDatabase } from './helpers';

describe.skipIf(!hasDatabase)('bulk import (live DB)', () => {
  const createdSkus: string[] = [];
  const createdCategoryNames: string[] = [];
  let companyId: string;

  beforeAll(async () => {
    companyId = (await prisma.companyProfile.findFirstOrThrow()).id;
  });

  afterAll(async () => {
    if (createdSkus.length) await prisma.product.deleteMany({ where: { sku: { in: createdSkus } } });
    if (createdCategoryNames.length) {
      await prisma.category.deleteMany({ where: { name: { in: createdCategoryNames } } });
    }
  });

  it('generates a template whose header row matches the documented schema', () => {
    const buffer = buildItemsTemplate();
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1 });
    expect(rows[0]).toEqual(ITEMS_TEMPLATE_HEADERS);
  });

  it('creates then updates a row with the same SKU (upsert-by-SKU), and isolates a bad row', async () => {
    const sku = `BULK-TEST-${Date.now()}`;
    const categoryName = `Bulk Test Category ${Date.now()}`;
    createdSkus.push(sku);
    createdCategoryNames.push(categoryName);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ITEMS_TEMPLATE_HEADERS,
      [sku, 'Bulk Test Item', 'desc', '1234', 12, 99.5, 'WAREHOUSE_ONLY', 2, 50, 'PCS', categoryName],
      [sku, 'Bulk Test Item Updated', 'desc2', '1234', 12, 150, 'HYBRID', 3, 75, 'BOX', categoryName],
      ['BAD-ROW-NO-NAME', '', '1234', 18, 100, 'WAREHOUSE_ONLY', 1, 10, 'PCS', ''],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Items');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

    const result = await importItemsFromWorkbook(companyId, buffer);
    expect(result.created).toBe(1);
    expect(result.updated).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].row).toBe(4);

    const product = await prisma.product.findUnique({
      where: { companyId_sku: { companyId, sku } },
      include: { category: true },
    });
    expect(product?.name).toBe('Bulk Test Item Updated');
    expect(Number(product?.sellingPrice)).toBe(150);
    expect(product?.fulfillmentType).toBe('HYBRID');
    expect(product?.category?.name).toBe(categoryName);
  });
});
