import type { Prisma, VendorCatalog } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export interface VendorSelectionMatch {
  moqSatisfied: true;
  vendorCatalog: VendorCatalog;
}

export interface VendorSelectionConflict {
  moqSatisfied: false;
  cheapestOverall: VendorCatalog;
  candidates: VendorCatalog[];
}

export type VendorSelectionResult = VendorSelectionMatch | VendorSelectionConflict;

// Picks the cheapest active vendor for a SKU whose MOQ the requested quantity actually
// clears. A vendor that's cheaper but demands a higher MOQ than was ordered is not
// eligible — that's the MOQ conflict the routing engine escalates to the internal team.
export async function selectCheapestVendor(
  productId: string,
  quantity: number,
  tx: Prisma.TransactionClient = prisma
): Promise<VendorSelectionResult> {
  const candidates = await tx.vendorCatalog.findMany({
    where: { productId, isActive: true, vendor: { isActive: true } },
    orderBy: { price: 'asc' },
  });

  if (candidates.length === 0) {
    throw new Error(`No active vendor carries product ${productId}.`);
  }

  const eligible = candidates.find((c) => c.vendorMoq <= quantity);
  if (eligible) {
    return { moqSatisfied: true, vendorCatalog: eligible };
  }

  return { moqSatisfied: false, cheapestOverall: candidates[0], candidates };
}
