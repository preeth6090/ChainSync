import { notFound, redirect } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getInvoiceForPrint } from '@/lib/services/invoicing';
import { InvoiceDocument } from '@/components/invoice/invoice-document';
import { getActiveCompanyId } from '@/lib/services/firm-context';

const STAFF_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.FINANCE];

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/invoices/${id}`);

  // Staff can print any invoice; a customer can only print their own.
  if (!STAFF_ROLES.includes(session.user.role)) {
    const customer = await prisma.customer.findUnique({ where: { userId: session.user.id } });
    const owns = await prisma.invoice.findFirst({
      where: { id, customerId: customer?.id ?? '__none__' },
      select: { id: true },
    });
    if (!owns) notFound();
  } else {
    const companyId = await getActiveCompanyId(session.user.id);
    const invoice = await prisma.invoice.findUnique({ where: { id }, select: { companyId: true } });
    if (!invoice || invoice.companyId !== companyId) notFound();
  }

  const { company, invoice } = await getInvoiceForPrint(id);
  return <InvoiceDocument company={company} invoice={invoice} />;
}
