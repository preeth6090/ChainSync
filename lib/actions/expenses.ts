'use server';

import { revalidatePath } from 'next/cache';
import { UserRole, ExpenseCategory, PaymentMode } from '@prisma/client';
import { requireRole } from '@/lib/auth-helpers';
import { createExpense } from '@/lib/services/expenses';

export type ExpenseActionResult = { success: true; data: { id: string } } | { success: false; error: string };

export async function recordExpenseAction(
  category: ExpenseCategory,
  description: string,
  amount: number,
  paidVia: PaymentMode,
  referenceNo?: string
): Promise<ExpenseActionResult> {
  try {
    const finance = await requireRole(UserRole.ADMIN, UserRole.FINANCE);
    const expense = await createExpense(finance.id, category, description, amount, paidVia, referenceNo);
    revalidatePath('/finance/purchases');
    return { success: true, data: { id: expense.id } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Could not record expense.' };
  }
}
