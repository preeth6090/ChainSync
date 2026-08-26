'use server';

import { revalidatePath } from 'next/cache';
import { Prisma, type DispatchProofType } from '@prisma/client';
import {
  resolveVendorMagicLink,
  getPurchaseOrderForVendor,
  acceptPurchaseOrder,
  proposeNewPrice,
  rejectPurchaseOrderByVendor,
  createShipment,
  addDispatchProof,
  type CreateShipmentInput,
} from '@/lib/services/vendor-portal';
import { saveUploadedFile } from '@/lib/services/file-storage';

// Prisma's Decimal fields are class instances, not plain data — React Server Components
// can't serialize them across the Server->Client boundary (PoActionCard is 'use client').
// Every Decimal has to be flattened to a plain number before this crosses that boundary.
function serializeVendorForClient(vendor: Awaited<ReturnType<typeof resolveVendorMagicLink>>['vendor']) {
  return { ...vendor, rating: vendor.rating.toNumber() };
}

function serializePurchaseOrderForClient(po: Awaited<ReturnType<typeof getPurchaseOrderForVendor>>) {
  return {
    ...po,
    totalAmount: po.totalAmount.toNumber(),
    items: po.items.map((item) => ({
      ...item,
      unitPrice: item.unitPrice.toNumber(),
      lineTotal: item.lineTotal.toNumber(),
      product: {
        ...item.product,
        gstRate: item.product.gstRate.toNumber(),
        sellingPrice: item.product.sellingPrice.toNumber(),
      },
    })),
    priceProposals: po.priceProposals.map((p) => ({ ...p, proposedAmount: p.proposedAmount.toNumber() })),
  };
}

export async function loadVendorPortal(token: string) {
  const { vendor, purchaseOrderId } = await resolveVendorMagicLink(token);
  if (!purchaseOrderId) throw new Error('This link is not scoped to a purchase order.');
  const purchaseOrder = await getPurchaseOrderForVendor(purchaseOrderId, vendor.id);
  return { vendor: serializeVendorForClient(vendor), purchaseOrder: serializePurchaseOrderForClient(purchaseOrder) };
}

// Returns only { id, status } rather than the raw PurchaseOrder/PriceProposal — those carry
// Decimal fields (totalAmount, proposedAmount), and a Server Action's return value crosses
// the same Server->Client serialization boundary as a Server Component prop does. The
// caller doesn't need the row back anyway; it calls router.refresh() for fresh data.
export async function acceptPoAction(token: string, poId: string) {
  const { vendor } = await resolveVendorMagicLink(token);
  const po = await acceptPurchaseOrder(poId, vendor.id);
  revalidatePath(`/vendor/${token}`);
  return { id: po.id, status: po.status };
}

export async function proposeNewPriceAction(token: string, poId: string, proposedAmount: number, reason: string) {
  const { vendor } = await resolveVendorMagicLink(token);
  const proposal = await proposeNewPrice(poId, vendor.id, new Prisma.Decimal(proposedAmount), reason);
  revalidatePath(`/vendor/${token}`);
  return { id: proposal.id };
}

export async function rejectPoAction(token: string, poId: string, reason: string) {
  const { vendor } = await resolveVendorMagicLink(token);
  await rejectPurchaseOrderByVendor(poId, vendor.id, reason);
  revalidatePath(`/vendor/${token}`);
}

export async function dispatchShipmentAction(token: string, poId: string, input: CreateShipmentInput) {
  const { vendor } = await resolveVendorMagicLink(token);
  const shipment = await createShipment(poId, vendor.id, input);
  revalidatePath(`/vendor/${token}`);
  return shipment;
}

export async function uploadDispatchProofAction(
  token: string,
  shipmentId: string,
  type: DispatchProofType,
  formData: FormData
) {
  const { vendor } = await resolveVendorMagicLink(token);
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) throw new Error('No file provided.');
  const fileUrl = await saveUploadedFile(file, `dispatch-proofs/${shipmentId}`);
  const proof = await addDispatchProof(shipmentId, vendor.id, type, fileUrl);
  revalidatePath(`/vendor/${token}`);
  return proof;
}
