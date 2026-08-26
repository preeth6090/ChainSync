'use server';

import { revalidatePath } from 'next/cache';
import { UserRole, DisputeReason } from '@prisma/client';
import { requireRole } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { createSaleReturn, listReturnableOrderItems } from '@/lib/services/sale-returns';

export type OrderLookupResult =
  | {
      success: true;
      data: {
        orderId: string;
        orderNumber: string;
        customerName: string;
        items: { orderItemId: string; productName: string; quantity: number; lineTotal: number }[];
      };
    }
  | { success: false; error: string };

export async function lookupOrderForReturnAction(orderNumber: string): Promise<OrderLookupResult> {
  try {
    await requireRole(UserRole.ADMIN, UserRole.FINANCE);
    const order = await prisma.order.findUnique({
      where: { orderNumber: orderNumber.trim() },
      include: { customer: { include: { user: true } } },
    });
    if (!order) return { success: false, error: `No order found with number "${orderNumber}".` };

    const items = await listReturnableOrderItems(order.id);
    if (items.length === 0) {
      return { success: false, error: 'This order has nothing left that can be returned (no invoice yet, or every line already credited).' };
    }

    return {
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customer.legalName ?? order.customer.user.name ?? order.customer.user.email ?? 'Customer',
        items,
      },
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Could not look up this order.' };
  }
}

export type SaleReturnActionResult =
  | { success: true; data: { creditNoteId: string; invoiceNumber: string } }
  | { success: false; error: string };

export async function createSaleReturnAction(
  orderId: string,
  orderItemIds: string[],
  reason: DisputeReason,
  notes?: string
): Promise<SaleReturnActionResult> {
  try {
    const staff = await requireRole(UserRole.ADMIN, UserRole.FINANCE);
    const creditNote = await createSaleReturn(staff.id, orderId, orderItemIds, reason, notes);
    revalidatePath('/sales/returns');
    revalidatePath('/finance/invoices');
    return { success: true, data: { creditNoteId: creditNote.id, invoiceNumber: creditNote.invoiceNumber } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Could not process sale return.' };
  }
}
