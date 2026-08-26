'use server';

import { revalidatePath } from 'next/cache';
import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/auth-helpers';
import { generateInvoiceForOrder } from '@/lib/services/billing';

// Manual override for staff — normally invoicing happens automatically via
// closeDisputeWindows once every shipment's window has passed undisputed.
export async function generateInvoiceForOrderAction(orderId: string) {
  await requireRole(UserRole.ADMIN, UserRole.FINANCE);
  const invoice = await generateInvoiceForOrder(orderId);
  revalidatePath('/orders');
  return { id: invoice.id, invoiceNumber: invoice.invoiceNumber };
}
