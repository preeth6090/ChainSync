'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, X } from 'lucide-react';
import { ExpenseCategory, PaymentMode } from '@prisma/client';
import { recordExpenseAction } from '@/lib/actions/expenses';

const CATEGORIES: ExpenseCategory[] = [
  ExpenseCategory.RENT,
  ExpenseCategory.UTILITIES,
  ExpenseCategory.SALARIES,
  ExpenseCategory.LOGISTICS,
  ExpenseCategory.OFFICE_SUPPLIES,
  ExpenseCategory.MARKETING,
  ExpenseCategory.OTHER,
];
const MODES: PaymentMode[] = [PaymentMode.CASH, PaymentMode.UPI, PaymentMode.NEFT, PaymentMode.RTGS, PaymentMode.CHEQUE, PaymentMode.CARD];

export function AddExpenseForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.OTHER);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidVia, setPaidVia] = useState<PaymentMode>(PaymentMode.CASH);
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
      >
        <Plus size={14} /> Add Expense
      </button>
    );
  }

  function submit() {
    setError(null);
    const numericAmount = Number(amount);
    if (!description.trim()) return setError('Enter a description.');
    if (!numericAmount || numericAmount <= 0) return setError('Enter a valid amount.');

    startTransition(async () => {
      const result = await recordExpenseAction(category, description, numericAmount, paidVia, reference);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setDescription('');
      setAmount('');
      setReference('');
      router.refresh();
    });
  }

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-900">Add Expense</p>
        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
          <X size={16} />
        </button>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
          className="rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.replace('_', ' ')}
            </option>
          ))}
        </select>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          type="number"
          placeholder="Amount"
          className="rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          className="rounded-lg border border-slate-200 px-2.5 py-2 text-sm sm:col-span-2"
        />
        <select
          value={paidVia}
          onChange={(e) => setPaidVia(e.target.value as PaymentMode)}
          className="rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
        >
          {MODES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <input
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Reference no. (optional)"
          className="rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
        />
      </div>
      <button
        onClick={submit}
        disabled={pending}
        className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
      >
        {pending && <Loader2 size={14} className="animate-spin" />}
        Save Expense
      </button>
      {error && <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}
    </div>
  );
}
