'use server';

import { revalidatePath } from 'next/cache';
import { UserRole, FulfillmentType } from '@prisma/client';
import { requireRole } from '@/lib/auth-helpers';
import { createProduct, updateProduct, createCategory, type ProductInput } from '@/lib/services/items';
import { importItemsFromWorkbook, type BulkImportResult } from '@/lib/services/bulk-import';
import { writeAuditLog } from '@/lib/services/audit';

const ITEM_MANAGER_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.PROCUREMENT_MAKER];

export type ItemActionResult<T> = { success: true; data: T } | { success: false; error: string };

export async function createProductAction(input: ProductInput): Promise<ItemActionResult<{ id: string }>> {
  try {
    const staff = await requireRole(...ITEM_MANAGER_ROLES);
    const product = await createProduct(input);
    revalidatePath('/items');
    revalidatePath('/catalog');
    await writeAuditLog(staff.id, 'PRODUCT_CREATED', 'Product', product.id, { sku: product.sku });
    return { success: true, data: { id: product.id } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Could not create item.' };
  }
}

export async function updateProductAction(
  id: string,
  input: Partial<ProductInput> & { isActive?: boolean }
): Promise<ItemActionResult<{ id: string }>> {
  try {
    const staff = await requireRole(...ITEM_MANAGER_ROLES);
    const product = await updateProduct(id, input);
    revalidatePath('/items');
    revalidatePath('/catalog');
    await writeAuditLog(staff.id, 'PRODUCT_UPDATED', 'Product', product.id, { sku: product.sku, changes: input });
    return { success: true, data: { id: product.id } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Could not update item.' };
  }
}

export async function createCategoryAction(name: string): Promise<ItemActionResult<{ id: string; name: string }>> {
  try {
    await requireRole(...ITEM_MANAGER_ROLES);
    const category = await createCategory(name);
    revalidatePath('/items');
    return { success: true, data: { id: category.id, name: category.name } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Could not create category.' };
  }
}

export type BulkImportActionResult = { success: true; data: BulkImportResult } | { success: false; error: string };

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export async function bulkImportItemsAction(file: File): Promise<BulkImportActionResult> {
  try {
    const staff = await requireRole(...ITEM_MANAGER_ROLES);
    if (!file || file.size === 0) return { success: false, error: 'No file uploaded.' };
    if (file.size > MAX_UPLOAD_BYTES) return { success: false, error: 'File is too large (max 5 MB).' };

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await importItemsFromWorkbook(buffer);
    revalidatePath('/items');
    revalidatePath('/catalog');
    await writeAuditLog(staff.id, 'ITEMS_BULK_IMPORTED', 'Product', 'bulk', {
      fileName: file.name,
      created: result.created,
      updated: result.updated,
      errorCount: result.errors.length,
    });
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Could not import items.' };
  }
}

export type { FulfillmentType };
