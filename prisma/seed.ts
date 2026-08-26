import { PrismaClient, UserRole, FulfillmentType, AddressType, CustomerType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding...');

  await prisma.companyProfile.upsert({
    where: { id: 'default-company' },
    update: {},
    create: {
      id: 'default-company',
      legalName: 'ChainSync Trading Pvt Ltd',
      gstin: '27AAAPL1234C1ZV',
      pan: 'AAAPL1234C',
      stateCode: '27',
      state: 'Maharashtra',
      addressLine1: '14 Industrial Estate Road',
      city: 'Mumbai',
      pincode: '400001',
      bankName: 'HDFC Bank',
      bankAccountName: 'ChainSync Trading Pvt Ltd',
      bankAccountNo: '50100123456789',
      bankIfsc: 'HDFC0000123',
      invoicePrefix: 'INV',
    },
  });

  await prisma.approvalConfig.upsert({
    where: { id: 'default-approval-config' },
    update: {},
    create: { id: 'default-approval-config', autoApproveBelow: 50000, isActive: true },
  });

  const warehouse = await prisma.warehouse.upsert({
    where: { code: 'WH-MUM-01' },
    update: {},
    create: { name: 'Mumbai Central Warehouse', code: 'WH-MUM-01' },
  });
  const existingWarehouseAddress = await prisma.address.findFirst({ where: { warehouseId: warehouse.id } });
  if (!existingWarehouseAddress) {
    await prisma.address.create({
      data: {
        type: AddressType.WAREHOUSE,
        line1: '14 Industrial Estate Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        stateCode: '27',
        pincode: '400001',
        warehouseId: warehouse.id,
        isDefault: true,
      },
    });
  }

  // --- Staff, one per role, so every "requireRole" path in the app has someone to sign in as ---
  const [admin, maker, checker, finance, warehouseStaff, vendorUserAccount, customerUserAccount] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@chainsync.test' },
      update: {},
      create: { email: 'admin@chainsync.test', name: 'Asha Admin', role: UserRole.ADMIN },
    }),
    prisma.user.upsert({
      where: { email: 'maker@chainsync.test' },
      update: {},
      create: { email: 'maker@chainsync.test', name: 'Manoj Maker', role: UserRole.PROCUREMENT_MAKER },
    }),
    prisma.user.upsert({
      where: { email: 'checker@chainsync.test' },
      update: {},
      create: { email: 'checker@chainsync.test', name: 'Chitra Checker', role: UserRole.PROCUREMENT_CHECKER },
    }),
    prisma.user.upsert({
      where: { email: 'finance@chainsync.test' },
      update: {},
      create: { email: 'finance@chainsync.test', name: 'Farhan Finance', role: UserRole.FINANCE },
    }),
    prisma.user.upsert({
      where: { email: 'warehouse@chainsync.test' },
      update: {},
      create: { email: 'warehouse@chainsync.test', name: 'Waseem Warehouse', role: UserRole.WAREHOUSE_STAFF },
    }),
    prisma.user.upsert({
      where: { email: 'vendor@genuinesuppliers.test' },
      update: {},
      create: { email: 'vendor@genuinesuppliers.test', name: 'Vikram Vendor', role: UserRole.VENDOR },
    }),
    prisma.user.upsert({
      where: { email: 'customer@example.test' },
      update: {},
      create: { email: 'customer@example.test', name: 'Neha Customer', role: UserRole.CUSTOMER },
    }),
  ]);

  const vendor = await prisma.vendor.upsert({
    where: { phone: '+919800000001' },
    update: {},
    create: {
      legalName: 'Genuine Suppliers Pvt Ltd',
      displayName: 'Genuine Suppliers',
      gstin: '29AAAPL5678C1ZQ',
      stateCode: '29',
      state: 'Karnataka',
      phone: '+919800000001',
      email: 'vendor@genuinesuppliers.test',
      bankAccountName: 'Genuine Suppliers Pvt Ltd',
      bankAccountNo: '60100987654321',
      bankIfsc: 'ICIC0000456',
    },
  });

  await prisma.vendorUser.upsert({
    where: { userId: vendorUserAccount.id },
    update: {},
    create: { vendorId: vendor.id, userId: vendorUserAccount.id, isPrimary: true },
  });

  // Customer is in Delhi, company is in Maharashtra — placing an order exercises the
  // inter-state (IGST) path; switch the address state to "Maharashtra"/"27" to test intra.
  const customer = await prisma.customer.upsert({
    where: { userId: customerUserAccount.id },
    update: {},
    create: {
      userId: customerUserAccount.id,
      customerType: CustomerType.B2B,
      gstin: '07AAAPL9012C1ZR',
      legalName: 'Neha Retail Traders',
      stateCode: '07',
      state: 'Delhi',
    },
  });

  const existingCustomerAddress = await prisma.address.findFirst({ where: { customerId: customer.id } });
  if (!existingCustomerAddress) {
    await prisma.address.create({
      data: {
        type: AddressType.SHIPPING,
        line1: '221B Connaught Place',
        city: 'New Delhi',
        state: 'Delhi',
        stateCode: '07',
        pincode: '110001',
        customerId: customer.id,
        isDefault: true,
      },
    });
  }

  const category = await prisma.category.upsert({
    where: { slug: 'industrial-supplies' },
    update: {},
    create: { name: 'Industrial Supplies', slug: 'industrial-supplies' },
  });

  // One product per fulfillment type, so routeOrderFulfillment's three branches are all
  // reachable from a single seeded catalog.
  const warehouseOnlyProduct = await prisma.product.upsert({
    where: { sku: 'WH-BOLT-M8' },
    update: {},
    create: {
      sku: 'WH-BOLT-M8',
      name: 'M8 Hex Bolt (Box of 100)',
      hsnCode: '7318',
      gstRate: 18,
      sellingPrice: 450,
      fulfillmentType: FulfillmentType.WAREHOUSE_ONLY,
      minCustomerMoq: 1,
      warehouseStock: 500,
      categoryId: category.id,
    },
  });

  const dropShipProduct = await prisma.product.upsert({
    where: { sku: 'DS-MOTOR-1HP' },
    update: {},
    create: {
      sku: 'DS-MOTOR-1HP',
      name: '1HP Induction Motor',
      hsnCode: '8501',
      gstRate: 18,
      sellingPrice: 6200,
      fulfillmentType: FulfillmentType.DROP_SHIP_ONLY,
      minCustomerMoq: 1,
      warehouseStock: 0,
      categoryId: category.id,
    },
  });

  // warehouseStock (10) < vendorMoq (5) means ordering ~11-14 units deliberately triggers a
  // MOQ conflict on the vendor-routed remainder — useful for exercising that guardrail.
  const hybridProduct = await prisma.product.upsert({
    where: { sku: 'HY-VALVE-2IN' },
    update: {},
    create: {
      sku: 'HY-VALVE-2IN',
      name: '2-inch Ball Valve',
      hsnCode: '8481',
      gstRate: 12,
      sellingPrice: 850,
      fulfillmentType: FulfillmentType.HYBRID,
      minCustomerMoq: 2,
      warehouseStock: 10,
      categoryId: category.id,
    },
  });

  await prisma.vendorCatalog.upsert({
    where: { vendorId_productId: { vendorId: vendor.id, productId: dropShipProduct.id } },
    update: {},
    create: { vendorId: vendor.id, productId: dropShipProduct.id, price: 5400, vendorMoq: 1, stock: 25, leadTimeDays: 5 },
  });
  await prisma.vendorCatalog.upsert({
    where: { vendorId_productId: { vendorId: vendor.id, productId: hybridProduct.id } },
    update: {},
    create: { vendorId: vendor.id, productId: hybridProduct.id, price: 700, vendorMoq: 5, stock: 100, leadTimeDays: 3 },
  });

  console.log('Seed complete. Sign-in emails (magic link):');
  console.table({
    admin: admin.email,
    procurementMaker: maker.email,
    procurementChecker: checker.email,
    finance: finance.email,
    warehouseStaff: warehouseStaff.email,
    vendorLogin: vendorUserAccount.email,
    customer: customerUserAccount.email,
  });
  console.log('Products:', [warehouseOnlyProduct.sku, dropShipProduct.sku, hybridProduct.sku].join(', '));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
