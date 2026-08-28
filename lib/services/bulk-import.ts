import * as XLSX from 'xlsx';
import { FulfillmentType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createCategory } from '@/lib/services/items';

export const ITEMS_TEMPLATE_HEADERS = [
  'SKU',
  'Name',
  'Description',
  'HSN Code',
  'GST Rate (%)',
  'Selling Price',
  'Fulfillment Type (WAREHOUSE_ONLY / DROP_SHIP_ONLY / HYBRID)',
  'Min Order Qty',
  'Warehouse Stock',
  'Unit',
  'Category',
];

const EXAMPLE_ROW = ['WIDGET-001', 'Sample Widget', 'Optional description', '8481', 18, 250, 'WAREHOUSE_ONLY', 1, 100, 'PCS', 'Hardware'];

export function buildItemsTemplate(): Buffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([ITEMS_TEMPLATE_HEADERS, EXAMPLE_ROW]);
  ws['!cols'] = ITEMS_TEMPLATE_HEADERS.map((h) => ({ wch: Math.max(14, h.length) }));
  XLSX.utils.book_append_sheet(wb, ws, 'Items');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

export interface BulkImportError {
  row: number;
  message: string;
}

export interface BulkImportResult {
  created: number;
  updated: number;
  errors: BulkImportError[];
}

const VALID_FULFILLMENT_TYPES = new Set<string>(Object.values(FulfillmentType));

function cell(row: unknown[], index: number): string | undefined {
  const value = row[index];
  return value === undefined || value === null || value === '' ? undefined : String(value).trim();
}

// Sheet parsing only — no formula evaluation, no external references. `sheet_to_json` with
// header:1 returns raw rows without treating the first row as a schema, so header detection
// and per-cell coercion are entirely explicit below rather than trusting column names.
export async function importItemsFromWorkbook(companyId: string, buffer: Buffer): Promise<BulkImportResult> {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error('The uploaded file has no sheets.');

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: undefined });
  const result: BulkImportResult = { created: 0, updated: 0, errors: [] };
  const categoryCache = new Map<string, string>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;
    if (!row || row.length === 0) continue;

    try {
      const sku = cell(row, 0);
      const name = cell(row, 1);
      const description = cell(row, 2);
      const hsnCode = cell(row, 3);
      const gstRate = Number(cell(row, 4) ?? 0);
      const sellingPrice = Number(cell(row, 5) ?? 0);
      const fulfillmentTypeRaw = (cell(row, 6) ?? 'WAREHOUSE_ONLY').toUpperCase();
      const minCustomerMoq = Number(cell(row, 7) ?? 1);
      const warehouseStock = Number(cell(row, 8) ?? 0);
      const unit = cell(row, 9) ?? 'PCS';
      const categoryName = cell(row, 10);

      if (!sku) throw new Error('SKU is required.');
      if (!name) throw new Error('Name is required.');
      if (!hsnCode) throw new Error('HSN code is required.');
      if (!sellingPrice || sellingPrice <= 0) throw new Error('Selling price must be a positive number.');
      if (!VALID_FULFILLMENT_TYPES.has(fulfillmentTypeRaw)) {
        throw new Error(`Fulfillment type must be one of: ${[...VALID_FULFILLMENT_TYPES].join(', ')}.`);
      }

      let categoryId: string | undefined;
      if (categoryName) {
        const key = categoryName.toLowerCase();
        categoryId = categoryCache.get(key);
        if (!categoryId) {
          const category = await createCategory(companyId, categoryName);
          categoryId = category.id;
          categoryCache.set(key, categoryId);
        }
      }

      const existing = await prisma.product.findUnique({ where: { companyId_sku: { companyId, sku } } });
      const data = {
        name,
        description: description ?? null,
        hsnCode,
        gstRate,
        sellingPrice,
        fulfillmentType: fulfillmentTypeRaw as FulfillmentType,
        minCustomerMoq: Math.max(1, minCustomerMoq),
        warehouseStock: Math.max(0, warehouseStock),
        unit,
        categoryId: categoryId ?? null,
      };

      if (existing) {
        await prisma.product.update({ where: { id: existing.id }, data });
        result.updated++;
      } else {
        await prisma.product.create({ data: { companyId, sku, ...data } });
        result.created++;
      }
    } catch (e) {
      result.errors.push({ row: rowNum, message: e instanceof Error ? e.message : 'Unknown error.' });
    }
  }

  return result;
}
