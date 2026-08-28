import { ExpenseCategory, PaymentMode } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export interface ExpenseFilter {
  from?: Date;
  to?: Date;
  category?: ExpenseCategory;
}

export async function createExpense(
  companyId: string,
  recordedByUserId: string,
  category: ExpenseCategory,
  description: string,
  amount: number,
  paidVia: PaymentMode,
  referenceNo?: string
) {
  if (!description.trim()) throw new Error('A description is required.');
  if (amount <= 0) throw new Error('Amount must be positive.');

  return prisma.expense.create({
    data: {
      companyId,
      category,
      description: description.trim(),
      amount,
      paidVia,
      referenceNo: referenceNo?.trim() || undefined,
      recordedByUserId,
    },
  });
}

export async function listExpenses(companyId: string, filter: ExpenseFilter = {}) {
  return prisma.expense.findMany({
    where: {
      companyId,
      ...(filter.category ? { category: filter.category } : {}),
      ...(filter.from || filter.to
        ? { expenseDate: { ...(filter.from ? { gte: filter.from } : {}), ...(filter.to ? { lte: filter.to } : {}) } }
        : {}),
    },
    include: { recordedBy: { select: { name: true, email: true } } },
    orderBy: { expenseDate: 'desc' },
  });
}
