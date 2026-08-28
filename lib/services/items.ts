import { FulfillmentType } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function listCategories(companyId: string) {
  return prisma.category.findMany({ where: { companyId }, orderBy: { name: 'asc' } });
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function createCategory(companyId: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Category name is required.');
  const slug = slugify(trimmed);
  if (!slug) throw new Error('Category name must contain at least one letter or number.');
  return prisma.category.upsert({
    where: { companyId_slug: { companyId, slug } },
    create: { companyId, name: trimmed, slug },
    update: { name: trimmed },
  });
}

export interface ProductInput {
  sku: string;
  name: string;
  description?: string;
  hsnCode: string;
  gstRate: number;
  sellingPrice: number;
  fulfillmentType: FulfillmentType;
  minCustomerMoq: number;
  warehouseStock: number;
  unit: string;
  categoryId?: string | null;
}

export async function createProduct(companyId: string, input: ProductInput) {
  const sku = input.sku.trim();
  const name = input.name.trim();
  if (!sku) throw new Error('SKU is required.');
  if (!name) throw new Error('Product name is required.');
  if (!input.hsnCode.trim()) throw new Error('HSN code is required.');
  if (input.sellingPrice <= 0) throw new Error('Selling price must be positive.');
  if (input.minCustomerMoq < 1) throw new Error('Minimum order quantity must be at least 1.');
  if (input.warehouseStock < 0) throw new Error('Warehouse stock cannot be negative.');

  const existing = await prisma.product.findUnique({ where: { companyId_sku: { companyId, sku } } });
  if (existing) throw new Error(`SKU "${sku}" is already in use.`);

  return prisma.product.create({
    data: {
      companyId,
      sku,
      name,
      description: input.description?.trim() || undefined,
      hsnCode: input.hsnCode.trim(),
      gstRate: input.gstRate,
      sellingPrice: input.sellingPrice,
      fulfillmentType: input.fulfillmentType,
      minCustomerMoq: input.minCustomerMoq,
      warehouseStock: input.warehouseStock,
      unit: input.unit.trim() || 'PCS',
      categoryId: input.categoryId || undefined,
    },
  });
}

export async function updateProduct(
  companyId: string,
  id: string,
  input: Partial<ProductInput> & { isActive?: boolean }
) {
  if (input.sellingPrice !== undefined && input.sellingPrice <= 0) {
    throw new Error('Selling price must be positive.');
  }
  if (input.warehouseStock !== undefined && input.warehouseStock < 0) {
    throw new Error('Warehouse stock cannot be negative.');
  }

  const existing = await prisma.product.findUnique({ where: { id }, select: { companyId: true } });
  if (!existing || existing.companyId !== companyId) {
    throw new Error('Product not found in this firm.');
  }

  return prisma.product.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description.trim() || null } : {}),
      ...(input.hsnCode !== undefined ? { hsnCode: input.hsnCode.trim() } : {}),
      ...(input.gstRate !== undefined ? { gstRate: input.gstRate } : {}),
      ...(input.sellingPrice !== undefined ? { sellingPrice: input.sellingPrice } : {}),
      ...(input.fulfillmentType !== undefined ? { fulfillmentType: input.fulfillmentType } : {}),
      ...(input.minCustomerMoq !== undefined ? { minCustomerMoq: input.minCustomerMoq } : {}),
      ...(input.warehouseStock !== undefined ? { warehouseStock: input.warehouseStock } : {}),
      ...(input.unit !== undefined ? { unit: input.unit.trim() || 'PCS' } : {}),
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId || null } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
}

export async function listProductsForAdmin(companyId: string) {
  return prisma.product.findMany({ where: { companyId }, include: { category: true }, orderBy: { createdAt: 'desc' } });
}
