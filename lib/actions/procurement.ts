'use server';

import { revalidatePath } from 'next/cache';
import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/auth-helpers';
import {
  submitPurchaseOrderForApproval,
  approvePurchaseOrder,
  rejectPurchaseOrder,
  performThreeWayMatch,
  releaseVendorPayable,
  recordGoodsReceipt,
  recordVendorBill,
  type VendorBillLineInput,
} from '@/lib/services/procurement';

// Every action resolves the acting user from the session via requireRole rather than
// accepting a makerUserId/checkerUserId argument — the service layer's segregation-of-duties
// check (approvePurchaseOrder rejects makerId === checkerUserId) is only meaningful if the
// caller can't simply pass whichever id makes the check pass.
//
// Every action also returns only plain scalar fields (id/status/counts), never the raw
// Prisma row — PurchaseOrder/VendorBill/VendorPayable/PurchaseOrderItem all carry Decimal
// fields, and a Server Action's return value crosses the same Server->Client serialization
// boundary a Server Component prop does, so returning one directly would fail at runtime
// the moment a client component calls this action, whether or not it uses the result.

export async function submitPoForApprovalAction(poId: string) {
  const maker = await requireRole(UserRole.ADMIN, UserRole.PROCUREMENT_MAKER);
  const po = await submitPurchaseOrderForApproval(poId, maker.id);
  revalidatePath('/procurement');
  return { id: po.id, status: po.status };
}

export async function approvePoAction(poId: string) {
  const checker = await requireRole(UserRole.ADMIN, UserRole.PROCUREMENT_CHECKER);
  const po = await approvePurchaseOrder(poId, checker.id);
  revalidatePath('/procurement');
  return { id: po.id, status: po.status };
}

export async function rejectPoAction(poId: string, reason: string) {
  const checker = await requireRole(UserRole.ADMIN, UserRole.PROCUREMENT_CHECKER);
  const po = await rejectPurchaseOrder(poId, checker.id, reason);
  revalidatePath('/procurement');
  return { id: po.id, status: po.status };
}

export async function runThreeWayMatchAction(vendorBillId: string) {
  await requireRole(UserRole.ADMIN, UserRole.FINANCE);
  const bill = await performThreeWayMatch(vendorBillId);
  revalidatePath('/procurement/bills');
  return { id: bill.id, matchStatus: bill.matchStatus };
}

export async function releaseVendorPayableAction(payableId: string) {
  await requireRole(UserRole.ADMIN, UserRole.FINANCE);
  const payable = await releaseVendorPayable(payableId);
  revalidatePath('/procurement/payables');
  return { id: payable.id, status: payable.status };
}

export async function recordGoodsReceiptAction(purchaseOrderItemId: string, quantityReceived: number) {
  await requireRole(UserRole.ADMIN, UserRole.WAREHOUSE_STAFF);
  const item = await recordGoodsReceipt(purchaseOrderItemId, quantityReceived);
  revalidatePath('/procurement');
  return { id: item.id, receivedQuantity: item.receivedQuantity };
}

export async function recordVendorBillAction(
  purchaseOrderId: string,
  billNumber: string,
  billAmount: number,
  lines: VendorBillLineInput[],
  fileUrl?: string
) {
  await requireRole(UserRole.ADMIN, UserRole.FINANCE);
  const bill = await recordVendorBill(purchaseOrderId, billNumber, billAmount, lines, fileUrl);
  revalidatePath('/procurement/bills');
  return { id: bill.id, matchStatus: bill.matchStatus };
}
