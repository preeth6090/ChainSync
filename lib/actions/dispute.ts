'use server';

import { revalidatePath } from 'next/cache';
import { UserRole } from '@prisma/client';
import { requireRole, requireCustomer } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import {
  markShipmentDelivered,
  raiseDispute,
  resolveDispute,
  type DisputeItemInput,
  type DisputeResolution,
} from '@/lib/services/dispute';
import { saveUploadedFile } from '@/lib/services/file-storage';

// Uploads one photo for an in-progress dispute report (before the dispute itself exists —
// the customer attaches evidence while filling out the form, then the resulting URLs are
// included in the DisputeItemInput[] passed to raiseDisputeAction).
export async function uploadDisputePhotoAction(formData: FormData) {
  await requireCustomer();
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) throw new Error('No file provided.');
  const url = await saveUploadedFile(file, 'dispute-photos');
  return { url };
}

export async function markShipmentDeliveredAction(shipmentId: string) {
  await requireRole(UserRole.ADMIN, UserRole.WAREHOUSE_STAFF);
  const shipment = await markShipmentDelivered(shipmentId);
  revalidatePath('/orders');
  return { id: shipment.id, status: shipment.status, disputeWindowEndsAt: shipment.disputeWindowEndsAt };
}

export async function raiseDisputeAction(
  orderId: string,
  shipmentId: string,
  description: string,
  items: DisputeItemInput[]
) {
  const customer = await requireCustomer();
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  if (order.customerId !== customer.id) throw new Error('This order does not belong to your account.');

  const dispute = await raiseDispute(orderId, shipmentId, customer.userId, description, items);
  revalidatePath(`/orders/${orderId}`);
  return { id: dispute.id, status: dispute.status };
}

export async function resolveDisputeAction(disputeId: string, resolution: DisputeResolution, resolutionNote?: string) {
  const staff = await requireRole(UserRole.ADMIN, UserRole.FINANCE);
  const dispute = await resolveDispute(disputeId, resolution, staff.id, resolutionNote);
  revalidatePath('/procurement/disputes');
  return { id: dispute.id, status: dispute.status };
}
