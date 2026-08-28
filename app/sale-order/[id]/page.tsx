import { notFound, redirect } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getOrderForPrint } from '@/lib/services/sale-order-print';
import { SaleOrderDocument } from '@/components/sale-order/sale-order-document';
import { getActiveCompanyId } from '@/lib/services/firm-context';

const STAFF_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.PROCUREMENT_MAKER, UserRole.PROCUREMENT_CHECKER, UserRole.FINANCE];

export default async function SaleOrderPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/sale-order/${id}`);

  if (!STAFF_ROLES.includes(session.user.role)) {
    const customer = await prisma.customer.findUnique({ where: { userId: session.user.id } });
    const owns = await prisma.order.findFirst({ where: { id, customerId: customer?.id ?? '__none__' }, select: { id: true } });
    if (!owns) notFound();
  } else {
    const companyId = await getActiveCompanyId(session.user.id);
    const order = await prisma.order.findUnique({ where: { id }, select: { companyId: true } });
    if (!order || order.companyId !== companyId) notFound();
  }

  const { company, order } = await getOrderForPrint(id);
  return <SaleOrderDocument company={company} order={order} />;
}
