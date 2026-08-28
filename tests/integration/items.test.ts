import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { createProduct, updateProduct, createCategory } from '@/lib/services/items';
import { FulfillmentType } from '@prisma/client';
import { hasDatabase } from './helpers';

describe.skipIf(!hasDatabase)('items service (live DB)', () => {
  const createdProductIds: string[] = [];
  const createdCategoryIds: string[] = [];

  afterAll(async () => {
    if (createdProductIds.length) await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
    if (createdCategoryIds.length) await prisma.category.deleteMany({ where: { id: { in: createdCategoryIds } } });
  });

  it('creates a product, then updates it in place', async () => {
    const category = await createCategory(`Test Category ${Date.now()}`);
    createdCategoryIds.push(category.id);

    const product = await createProduct({
      sku: `TEST-ITEM-${Date.now()}`,
      name: 'Test Widget',
      hsnCode: '1234',
      gstRate: 18,
      sellingPrice: 100,
      fulfillmentType: FulfillmentType.WAREHOUSE_ONLY,
      minCustomerMoq: 1,
      warehouseStock: 10,
      unit: 'PCS',
      categoryId: category.id,
    });
    createdProductIds.push(product.id);
    expect(Number(product.sellingPrice)).toBe(100);

    const updated = await updateProduct(product.id, { sellingPrice: 150, isActive: false });
    expect(Number(updated.sellingPrice)).toBe(150);
    expect(updated.isActive).toBe(false);
  });

  it('rejects a duplicate SKU', async () => {
    const sku = `TEST-DUP-${Date.now()}`;
    const first = await createProduct({
      sku,
      name: 'First',
      hsnCode: '1234',
      gstRate: 18,
      sellingPrice: 100,
      fulfillmentType: FulfillmentType.WAREHOUSE_ONLY,
      minCustomerMoq: 1,
      warehouseStock: 0,
      unit: 'PCS',
    });
    createdProductIds.push(first.id);

    await expect(
      createProduct({
        sku,
        name: 'Duplicate',
        hsnCode: '1234',
        gstRate: 18,
        sellingPrice: 100,
        fulfillmentType: FulfillmentType.WAREHOUSE_ONLY,
        minCustomerMoq: 1,
        warehouseStock: 0,
        unit: 'PCS',
      })
    ).rejects.toThrow(/already in use/);
  });

  it('rejects a non-positive selling price', async () => {
    await expect(
      createProduct({
        sku: `TEST-BADPRICE-${Date.now()}`,
        name: 'Bad Price',
        hsnCode: '1234',
        gstRate: 18,
        sellingPrice: 0,
        fulfillmentType: FulfillmentType.WAREHOUSE_ONLY,
        minCustomerMoq: 1,
        warehouseStock: 0,
        unit: 'PCS',
      })
    ).rejects.toThrow(/positive/);
  });
});
