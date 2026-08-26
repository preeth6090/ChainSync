'use server';

import { revalidatePath } from 'next/cache';
import { UserRole, QuotationStatus } from '@prisma/client';
import { requireRole } from '@/lib/auth-helpers';
import { createQuotation, updateQuotationStatus, convertQuotationToOrder, type QuotationLineInput } from '@/lib/services/quotations';

const SALES_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.FINANCE];

export type QuotationActionResult<T> = { success: true; data: T } | { success: false; error: string };

export async function createQuotationAction(
  customerId: string,
  lines: QuotationLineInput[],
  validUntil?: string,
  notes?: string
): Promise<QuotationActionResult<{ id: string; quotationNumber: string }>> {
  try {
    const staff = await requireRole(...SALES_ROLES);
    const quotation = await createQuotation(
      staff.id,
      customerId,
      lines,
      validUntil ? new Date(validUntil) : undefined,
      notes
    );
    revalidatePath('/sales/quotations');
    return { success: true, data: { id: quotation.id, quotationNumber: quotation.quotationNumber } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Could not create quotation.' };
  }
}

export async function setQuotationStatusAction(
  quotationId: string,
  status: QuotationStatus
): Promise<QuotationActionResult<{ status: QuotationStatus }>> {
  try {
    await requireRole(...SALES_ROLES);
    const quotation = await updateQuotationStatus(quotationId, status);
    revalidatePath('/sales/quotations');
    return { success: true, data: { status: quotation.status } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Could not update quotation.' };
  }
}

export async function convertQuotationAction(
  quotationId: string
): Promise<QuotationActionResult<{ orderId: string }>> {
  try {
    await requireRole(...SALES_ROLES);
    const order = await convertQuotationToOrder(quotationId);
    revalidatePath('/sales/quotations');
    revalidatePath('/orders');
    return { success: true, data: { orderId: order.id } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Could not convert quotation.' };
  }
}
