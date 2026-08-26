import { notFound, redirect } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getShipmentForPrint } from '@/lib/services/delivery-challan';
import { DeliveryChallanDocument } from '@/components/delivery-challan/delivery-challan-document';

const STAFF_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.FINANCE, UserRole.WAREHOUSE_STAFF];

export default async function DeliveryChallanPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/delivery-challan/${id}`);

  if (!STAFF_ROLES.includes(session.user.role)) {
    const customer = await prisma.customer.findUnique({ where: { userId: session.user.id } });
    const owns = await prisma.shipment.findFirst({
      where: { id, order: { customerId: customer?.id ?? '__none__' } },
      select: { id: true },
    });
    if (!owns) notFound();
  }

  const { company, shipment } = await getShipmentForPrint(id);
  return <DeliveryChallanDocument company={company} shipment={shipment} />;
}
