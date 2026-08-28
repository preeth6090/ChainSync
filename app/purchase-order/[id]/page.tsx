import { notFound, redirect } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { resolveVendorMagicLink, InvalidMagicLinkError } from '@/lib/services/vendor-portal';
import { getPurchaseOrderForPrint } from '@/lib/services/po-print';
import { PurchaseOrderDocument } from '@/components/purchase-order/po-document';
import { getActiveCompanyId } from '@/lib/services/firm-context';

const STAFF_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.PROCUREMENT_MAKER, UserRole.PROCUREMENT_CHECKER, UserRole.FINANCE];

export default async function PurchaseOrderPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;

  if (token) {
    // Vendor access via their SMS/WhatsApp magic link — no NextAuth session involved, so this
    // is verified separately from the staff branch below rather than through auth().
    try {
      const { vendor } = await resolveVendorMagicLink(token);
      const po = await prisma.purchaseOrder.findUnique({ where: { id }, select: { vendorId: true } });
      if (!po || po.vendorId !== vendor.id) notFound();
    } catch (err) {
      if (err instanceof InvalidMagicLinkError) notFound();
      throw err;
    }
  } else {
    const session = await auth();
    if (!session?.user) redirect(`/login?callbackUrl=/purchase-order/${id}`);
    if (!STAFF_ROLES.includes(session.user.role)) redirect('/');
    const companyId = await getActiveCompanyId(session.user.id);
    const po = await prisma.purchaseOrder.findUnique({ where: { id }, select: { companyId: true } });
    if (!po || po.companyId !== companyId) notFound();
  }

  const { company, purchaseOrder } = await getPurchaseOrderForPrint(id);
  return <PurchaseOrderDocument company={company} purchaseOrder={purchaseOrder} />;
}
