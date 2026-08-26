'use server';

import { revalidatePath } from 'next/cache';
import { UserRole, FulfillmentType } from '@prisma/client';
import { requireRole } from '@/lib/auth-helpers';
import { createProduct, updateProduct, createCategory, type ProductInput } from '@/lib/services/items';

const ITEM_MANAGER_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.PROCUREMENT_MAKER];

export type ItemActionResult<T> = { success: true; data: T } | { success: false; error: string };

export async function createProductAction(input: ProductInput): Promise<ItemActionResult<{ id: string }>> {
  try {
    await requireRole(...ITEM_MANAGER_ROLES);
    const product = await createProduct(input);
    revalidatePath('/items');
    revalidatePath('/catalog');
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
    await requireRole(...ITEM_MANAGER_ROLES);
    const product = await updateProduct(id, input);
    revalidatePath('/items');
    revalidatePath('/catalog');
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

export type { FulfillmentType };
