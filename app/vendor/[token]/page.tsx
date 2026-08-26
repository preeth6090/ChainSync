import { notFound } from 'next/navigation';
import { loadVendorPortal } from '@/lib/actions/vendor-portal';
import { InvalidMagicLinkError } from '@/lib/services/vendor-portal';
import { PoActionCard } from '@/components/vendor-portal/po-action-card';

export default async function VendorPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  try {
    const { vendor, purchaseOrder } = await loadVendorPortal(token);
    return (
      <main className="min-h-dvh bg-slate-50">
        <PoActionCard token={token} vendor={vendor} purchaseOrder={purchaseOrder} />
      </main>
    );
  } catch (err) {
    if (err instanceof InvalidMagicLinkError) {
      return (
        <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-6 text-center">
          <div>
            <p className="text-lg font-semibold text-slate-800">Link expired</p>
            <p className="mt-1 text-sm text-slate-500">{err.message}</p>
          </div>
        </main>
      );
    }
    notFound();
  }
}
