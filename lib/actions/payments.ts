'use server';

import { revalidatePath } from 'next/cache';
import { UserRole, PaymentMode } from '@prisma/client';
import { requireRole, requireCustomer } from '@/lib/auth-helpers';
import { submitPayment, verifyPayment, rejectPayment, recordPayment } from '@/lib/services/payments';
import { writeAuditLog } from '@/lib/services/audit';

export type PaymentActionResult =
  | { success: true; data: { id: string } }
  | { success: false; error: string };

export async function recordPaymentAction(
  orderId: string,
  amount: number,
  mode: PaymentMode,
  utrNumber: string,
  invoiceId?: string
): Promise<PaymentActionResult> {
  try {
    const finance = await requireRole(UserRole.ADMIN, UserRole.FINANCE);
    const payment = await recordPayment(orderId, finance.id, amount, mode, utrNumber, invoiceId);
    revalidatePath('/finance/invoices');
    revalidatePath('/orders');
    await writeAuditLog(finance.id, 'PAYMENT_RECORDED', 'Payment', payment.id, { orderId, amount, mode });
    return { success: true, data: { id: payment.id } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Could not record payment.' };
  }
}

export async function submitPaymentAction(
  orderId: string,
  amount: number,
  mode: PaymentMode,
  utrNumber: string,
  invoiceId?: string
) {
  const customer = await requireCustomer();
  const payment = await submitPayment(orderId, customer.id, amount, mode, utrNumber, invoiceId);
  revalidatePath('/orders');
  await writeAuditLog(customer.userId, 'PAYMENT_SUBMITTED', 'Payment', payment.id, { orderId, amount, mode });
  return { id: payment.id, status: payment.status };
}

export async function verifyPaymentAction(paymentId: string) {
  const finance = await requireRole(UserRole.ADMIN, UserRole.FINANCE);
  const payment = await verifyPayment(paymentId, finance.id);
  revalidatePath('/finance/payments');
  await writeAuditLog(finance.id, 'PAYMENT_VERIFIED', 'Payment', payment.id);
  return { id: payment.id, status: payment.status };
}

export async function rejectPaymentAction(paymentId: string, reason: string) {
  const finance = await requireRole(UserRole.ADMIN, UserRole.FINANCE);
  const payment = await rejectPayment(paymentId, finance.id, reason);
  revalidatePath('/finance/payments');
  await writeAuditLog(finance.id, 'PAYMENT_REJECTED', 'Payment', payment.id, { reason });
  return { id: payment.id, status: payment.status };
}
