import { Prisma } from '@prisma/client';

// Indian financial year runs Apr 1 - Mar 31.
function currentFinancialYear(date = new Date()): string {
  const startYear = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

// GST law requires gapless, sequential invoice numbers per financial year, per firm (each
// company has its own GSTIN and therefore its own legal sequence). Must be called inside the
// same transaction that creates the Invoice, and that transaction must run at SERIALIZABLE
// isolation (see runSerializable) so concurrent invoice creation can't hand out the same
// number twice.
export async function nextInvoiceNumber(tx: Prisma.TransactionClient, companyId: string): Promise<string> {
  const financialYear = currentFinancialYear();
  const seq = await tx.invoiceSequence.upsert({
    where: { companyId_financialYear: { companyId, financialYear } },
    create: { companyId, financialYear, lastNumber: 1 },
    update: { lastNumber: { increment: 1 } },
  });
  return `${seq.prefix}/${financialYear}/${String(seq.lastNumber).padStart(5, '0')}`;
}

// PO/Order/Quotation numbers have no legal gapless requirement, so a simple per-firm
// count-based scheme is enough — it only needs to be free of duplicates within that firm,
// which SERIALIZABLE isolation guarantees as long as the caller runs this inside a
// runSerializable transaction.
export async function generatePoNumber(tx: Prisma.TransactionClient, companyId: string): Promise<string> {
  const count = await tx.purchaseOrder.count({ where: { companyId } });
  return `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
}

export async function generateOrderNumber(tx: Prisma.TransactionClient, companyId: string): Promise<string> {
  const count = await tx.order.count({ where: { companyId } });
  return `ORD-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
}

// Shipments have no companyId of their own (scoped transitively through their order/PO) and
// no uniqueness requirement finer than "don't collide" — a global counter is fine.
export async function generateShipmentNumber(tx: Prisma.TransactionClient): Promise<string> {
  const count = await tx.shipment.count();
  return `SHP-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
}

export async function generateQuotationNumber(tx: Prisma.TransactionClient, companyId: string): Promise<string> {
  const count = await tx.quotation.count({ where: { companyId } });
  return `QTN-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
}
