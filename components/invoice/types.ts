import type { getInvoiceForPrint } from '@/lib/services/invoicing';

export type InvoicePrintData = Awaited<ReturnType<typeof getInvoiceForPrint>>;
export type CompanyLetterheadData = InvoicePrintData['company'];
export type InvoiceDocumentData = InvoicePrintData['invoice'];
export type InvoiceLineData = InvoiceDocumentData['items'][number];
