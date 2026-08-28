import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { createProduct, listProductsForAdmin } from '@/lib/services/items';
import { getActiveCompanyId, resolveActiveCompanyId } from '@/lib/services/firm-context';
import { FulfillmentType } from '@prisma/client';
import { hasDatabase } from './helpers';

// The entire point of the multi-firm retrofit: two firms' data must never leak into each
// other's queries. This spins up a second, throwaway firm alongside the real seeded one,
// puts a product in each, and asserts every relevant read only ever sees its own firm's row.
describe.skipIf(!hasDatabase)('multi-firm data isolation (live DB)', () => {
  let firmA: string; // the real seeded firm
  let firmB: string; // a second, disposable firm created just for this test
  let productA: string;
  let productB: string;
  let testUserId: string;

  beforeAll(async () => {
    firmA = (await prisma.companyProfile.findFirstOrThrow()).id;

    const company = await prisma.companyProfile.create({
      data: {
        legalName: `Test Firm B ${Date.now()}`,
        gstin: '29TESTB0000C1ZB',
        stateCode: '29',
        state: 'Karnataka',
        addressLine1: 'Test Address',
        city: 'Bengaluru',
        pincode: '560001',
      },
    });
    firmB = company.id;

    const productAResult = await createProduct(firmA, {
      sku: `ISO-A-${Date.now()}`,
      name: 'Firm A Only Product',
      hsnCode: '1234',
      gstRate: 18,
      sellingPrice: 100,
      fulfillmentType: FulfillmentType.WAREHOUSE_ONLY,
      minCustomerMoq: 1,
      warehouseStock: 10,
      unit: 'PCS',
    });
    productA = productAResult.id;

    const productBResult = await createProduct(firmB, {
      sku: `ISO-B-${Date.now()}`,
      name: 'Firm B Only Product',
      hsnCode: '5678',
      gstRate: 18,
      sellingPrice: 200,
      fulfillmentType: FulfillmentType.WAREHOUSE_ONLY,
      minCustomerMoq: 1,
      warehouseStock: 5,
      unit: 'PCS',
    });
    productB = productBResult.id;

    // A staff user who belongs to BOTH firms, to test the switcher's cookie-based resolution.
    const user = await prisma.user.create({
      data: { email: `iso-test-${Date.now()}@example.test`, name: 'Isolation Test User', role: 'ADMIN' },
    });
    testUserId = user.id;
    await prisma.userFirm.createMany({
      data: [
        { userId: testUserId, companyId: firmA, isDefault: true },
        { userId: testUserId, companyId: firmB, isDefault: false },
      ],
    });
  });

  afterAll(async () => {
    await prisma.userFirm.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    await prisma.product.delete({ where: { id: productA } }).catch(() => {});
    await prisma.product.delete({ where: { id: productB } }).catch(() => {});
    await prisma.companyProfile.delete({ where: { id: firmB } }).catch(() => {});
  });

  it('listProductsForAdmin only returns the requested firm\'s products', async () => {
    const firmAProducts = await listProductsForAdmin(firmA);
    const firmBProducts = await listProductsForAdmin(firmB);

    expect(firmAProducts.some((p) => p.id === productA)).toBe(true);
    expect(firmAProducts.some((p) => p.id === productB)).toBe(false);

    expect(firmBProducts.some((p) => p.id === productB)).toBe(true);
    expect(firmBProducts.some((p) => p.id === productA)).toBe(false);
  });

  it('the same SKU string can exist independently in two different firms', async () => {
    const sku = `SHARED-SKU-${Date.now()}`;
    const inFirmA = await createProduct(firmA, {
      sku,
      name: 'Shared SKU in Firm A',
      hsnCode: '1111',
      gstRate: 18,
      sellingPrice: 50,
      fulfillmentType: FulfillmentType.WAREHOUSE_ONLY,
      minCustomerMoq: 1,
      warehouseStock: 1,
      unit: 'PCS',
    });
    const inFirmB = await createProduct(firmB, {
      sku,
      name: 'Shared SKU in Firm B',
      hsnCode: '2222',
      gstRate: 18,
      sellingPrice: 75,
      fulfillmentType: FulfillmentType.WAREHOUSE_ONLY,
      minCustomerMoq: 1,
      warehouseStock: 1,
      unit: 'PCS',
    });

    expect(inFirmA.id).not.toBe(inFirmB.id);
    expect(inFirmA.sku).toBe(inFirmB.sku);

    await prisma.product.delete({ where: { id: inFirmA.id } });
    await prisma.product.delete({ where: { id: inFirmB.id } });
  });

  it('resolves to the default firm membership when no cookie is set', async () => {
    const memberships = await prisma.userFirm.findMany({ where: { userId: testUserId } });
    expect(resolveActiveCompanyId(memberships)).toBe(firmA);
  });

  it('resolves to the cookie-selected firm when the user is a member of it', async () => {
    const memberships = await prisma.userFirm.findMany({ where: { userId: testUserId } });
    expect(resolveActiveCompanyId(memberships, firmB)).toBe(firmB);
  });

  it('ignores a cookie value for a firm the user does not belong to', async () => {
    const memberships = await prisma.userFirm.findMany({ where: { userId: testUserId } });
    expect(resolveActiveCompanyId(memberships, 'some-other-firm-id')).toBe(firmA);
  });

  it('throws NoActiveFirmError for a user with zero firm memberships', async () => {
    const orphanUser = await prisma.user.create({
      data: { email: `iso-orphan-${Date.now()}@example.test`, name: 'Orphan User', role: 'ADMIN' },
    });
    await expect(getActiveCompanyId(orphanUser.id)).rejects.toThrow(/not a member of any firm/);
    await prisma.user.delete({ where: { id: orphanUser.id } });
  });
});
