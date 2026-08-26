'use server';

import { revalidatePath } from 'next/cache';
import { UserRole, PaymentMode } from '@prisma/client';
import { requireRole, requireCustomer } from '@/lib/auth-helpers';
import { submitPayment, verifyPayment, rejectPayment } from '@/lib/services/payments';

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
  return { id: payment.id, status: payment.status };
}

export async function verifyPaymentAction(paymentId: string) {
  const finance = await requireRole(UserRole.ADMIN, UserRole.FINANCE);
  const payment = await verifyPayment(paymentId, finance.id);
  revalidatePath('/finance/payments');
  return { id: payment.id, status: payment.status };
}

export async function rejectPaymentAction(paymentId: string, reason: string) {
  const finance = await requireRole(UserRole.ADMIN, UserRole.FINANCE);
  const payment = await rejectPayment(paymentId, finance.id, reason);
  revalidatePath('/finance/payments');
  return { id: payment.id, status: payment.status };
}
