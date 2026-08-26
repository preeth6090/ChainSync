'use server';

import { revalidatePath } from 'next/cache';
import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/auth-helpers';
import { resolveMoqConflictManually, type MoqConflictResolution } from '@/lib/services/order-routing';

export async function resolveMoqConflictAction(alertId: string, resolution: MoqConflictResolution) {
  const staff = await requireRole(UserRole.ADMIN, UserRole.PROCUREMENT_MAKER);
  const result = await resolveMoqConflictManually(alertId, staff.id, resolution);
  revalidatePath('/procurement');
  return result;
}
