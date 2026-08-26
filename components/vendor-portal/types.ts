import type { loadVendorPortal } from '@/lib/actions/vendor-portal';

export type VendorPortalData = Awaited<ReturnType<typeof loadVendorPortal>>;
export type VendorPortalVendor = VendorPortalData['vendor'];
export type PurchaseOrderWithDetails = VendorPortalData['purchaseOrder'];
export type PurchaseOrderItemWithProduct = PurchaseOrderWithDetails['items'][number];
