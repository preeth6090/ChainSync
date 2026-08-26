import { PaymentMode, PaymentStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { notifyInternalTeam } from '@/lib/services/notifications';

// Customer submits a UTR/reference number against an order (optionally a specific invoice)
// after paying by NEFT/RTGS/UPI/cash outside the app. Status starts PENDING_VERIFICATION —
// nothing is considered paid until finance manually matches it against the bank statement.
export async function submitPayment(
  orderId: string,
  customerId: string,
  amount: number,
  mode: PaymentMode,
  utrNumber: string,
  invoiceId?: string
) {
  if (!utrNumber.trim()) throw new Error('A UTR / transaction reference number is required.');
  if (amount <= 0) throw new Error('Payment amount must be positive.');

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    if (order.customerId !== customerId) throw new Error('This order does not belong to this customer.');

    if (invoiceId) {
      const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
      if (invoice.orderId !== orderId) throw new Error('That invoice does not belong to this order.');
    }

    const payment = await tx.payment.create({
      data: {
        orderId,
        customerId,
        invoiceId,
        amount,
        mode,
        utrNumber: utrNumber.trim(),
        status: PaymentStatus.PENDING_VERIFICATION,
      },
    });

    await notifyInternalTeam(
      tx,
      'Payment submitted for verification',
      `Order ${order.orderNumber}: customer submitted a ${mode} payment of Rs.${amount} (UTR ${utrNumber}).`,
      'Payment',
      payment.id
    );

    return payment;
  });
}

// Finance checks the bank statement, matches UTR + amount, and closes the loop.
export async function verifyPayment(paymentId: string, verifiedByUserId: string) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
    if (payment.status !== PaymentStatus.PENDING_VERIFICATION) {
      throw new Error(`Payment ${paymentId} is not pending verification (current: ${payment.status}).`);
    }
    return tx.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.VERIFIED, verifiedByUserId, verifiedAt: new Date() },
    });
  });
}

export async function rejectPayment(paymentId: string, verifiedByUserId: string, reason: string) {
  return prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: PaymentStatus.REJECTED,
      verifiedByUserId,
      verifiedAt: new Date(),
      rejectionReason: reason,
    },
  });
}

// Finance/Admin logging a payment they already have in hand — cash handed over, a cheque
// cleared, a UPI screenshot confirmed by phone. Unlike submitPayment (customer-initiated,
// starts PENDING_VERIFICATION), this is created and verified in the same step because
// there's nothing left to reconcile: the staff member recording it IS the verification.
export async function recordPayment(
  orderId: string,
  recordedByUserId: string,
  amount: number,
  mode: PaymentMode,
  utrNumber: string,
  invoiceId?: string
) {
  if (!utrNumber.trim()) throw new Error('A reference number (UTR / cheque no. / receipt no.) is required.');
  if (amount <= 0) throw new Error('Payment amount must be positive.');

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });

    if (invoiceId) {
      const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
      if (invoice.orderId !== orderId) throw new Error('That invoice does not belong to this order.');
    }

    return tx.payment.create({
      data: {
        orderId,
        customerId: order.customerId,
        invoiceId,
        amount,
        mode,
        utrNumber: utrNumber.trim(),
        status: PaymentStatus.VERIFIED,
        verifiedByUserId: recordedByUserId,
        verifiedAt: new Date(),
      },
    });
  });
}
