import { Prisma } from '@prisma/client';

// Indian financial year runs Apr 1 - Mar 31.
function currentFinancialYear(date = new Date()): string {
  const startYear = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

// GST law requires gapless, sequential invoice numbers per financial year. This must be
// called inside the same transaction that creates the Invoice, and that transaction must
// run at SERIALIZABLE isolation (see runSerializable) so concurrent invoice creation can't
// hand out the same number twice.
export async function nextInvoiceNumber(tx: Prisma.TransactionClient): Promise<string> {
  const financialYear = currentFinancialYear();
  const seq = await tx.invoiceSequence.upsert({
    where: { financialYear },
    create: { financialYear, lastNumber: 1 },
    update: { lastNumber: { increment: 1 } },
  });
  return `${seq.prefix}/${financialYear}/${String(seq.lastNumber).padStart(5, '0')}`;
}

// PO/Order numbers have no legal gapless requirement, so a simple count-based scheme is
// enough — it only needs to be free of duplicates, which SERIALIZABLE isolation guarantees
// as long as the caller runs this inside a runSerializable transaction.
export async function generatePoNumber(tx: Prisma.TransactionClient): Promise<string> {
  const count = await tx.purchaseOrder.count();
  return `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
}

export async function generateOrderNumber(tx: Prisma.TransactionClient): Promise<string> {
  const count = await tx.order.count();
  return `ORD-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
}

export async function generateShipmentNumber(tx: Prisma.TransactionClient): Promise<string> {
  const count = await tx.shipment.count();
  return `SHP-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
}
