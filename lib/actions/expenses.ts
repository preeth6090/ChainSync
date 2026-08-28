'use server';

import { revalidatePath } from 'next/cache';
import { UserRole, ExpenseCategory, PaymentMode } from '@prisma/client';
import { requireRole } from '@/lib/auth-helpers';
import { createExpense } from '@/lib/services/expenses';
import { writeAuditLog } from '@/lib/services/audit';

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
    await writeAuditLog(finance.id, 'EXPENSE_RECORDED', 'Expense', expense.id, { category, amount, paidVia });
    return { success: true, data: { id: expense.id } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Could not record expense.' };
  }
}
