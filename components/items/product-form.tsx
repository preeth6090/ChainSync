'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, X, PackagePlus, Pencil } from 'lucide-react';
import { FulfillmentType } from '@prisma/client';
import { createProductAction, updateProductAction, createCategoryAction } from '@/lib/actions/items';

export interface CategoryOption {
  id: string;
  name: string;
}

export interface ExistingProduct {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  hsnCode: string;
  gstRate: number;
  sellingPrice: number;
  fulfillmentType: FulfillmentType;
  minCustomerMoq: number;
  warehouseStock: number;
  unit: string;
  categoryId: string | null;
  isActive: boolean;
}

const FULFILLMENT_TYPES: FulfillmentType[] = [FulfillmentType.WAREHOUSE_ONLY, FulfillmentType.DROP_SHIP_ONLY, FulfillmentType.HYBRID];
const GST_RATES = [0, 5, 12, 18, 28];

const EMPTY = {
  sku: '',
  name: '',
  description: '',
  hsnCode: '',
  gstRate: 18,
  sellingPrice: '',
  fulfillmentType: FulfillmentType.WAREHOUSE_ONLY,
  minCustomerMoq: 1,
  warehouseStock: 0,
  unit: 'PCS',
  categoryId: '',
};

export function ProductForm({
  categories: initialCategories,
  existing,
  trigger,
}: {
  categories: CategoryOption[];
  existing?: ExistingProduct;
  trigger?: 'add' | 'edit';
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState(initialCategories);
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [form, setForm] = useState(
    existing
      ? {
          sku: existing.sku,
          name: existing.name,
          description: existing.description ?? '',
          hsnCode: existing.hsnCode,
          gstRate: existing.gstRate,
          sellingPrice: String(existing.sellingPrice),
          fulfillmentType: existing.fulfillmentType,
          minCustomerMoq: existing.minCustomerMoq,
          warehouseStock: existing.warehouseStock,
          unit: existing.unit,
          categoryId: existing.categoryId ?? '',
        }
      : EMPTY
  );
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={
          trigger === 'edit'
            ? 'flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50'
            : 'flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-slate-800'
        }
      >
        {trigger === 'edit' ? (
          <>
            <Pencil size={12} /> Edit
          </>
        ) : (
          <>
            <PackagePlus size={14} /> Add Item
          </>
        )}
      </button>
    );
  }

  function addCategory() {
    if (!newCategory.trim()) return;
    startTransition(async () => {
      const result = await createCategoryAction(newCategory);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setCategories((prev) => [...prev, result.data].sort((a, b) => a.name.localeCompare(b.name)));
      setForm((f) => ({ ...f, categoryId: result.data.id }));
      setNewCategory('');
      setShowNewCategory(false);
    });
  }

  function submit() {
    setError(null);
    const sellingPrice = Number(form.sellingPrice);
    if (!form.sku.trim()) return setError('SKU is required.');
    if (!form.name.trim()) return setError('Name is required.');
    if (!form.hsnCode.trim()) return setError('HSN code is required.');
    if (!sellingPrice || sellingPrice <= 0) return setError('Enter a valid selling price.');

    const payload = {
      sku: form.sku,
      name: form.name,
      description: form.description,
      hsnCode: form.hsnCode,
      gstRate: form.gstRate,
      sellingPrice,
      fulfillmentType: form.fulfillmentType,
      minCustomerMoq: form.minCustomerMoq,
      warehouseStock: form.warehouseStock,
      unit: form.unit,
      categoryId: form.categoryId || null,
      ...(existing ? { isActive } : {}),
    };

    startTransition(async () => {
      const result = existing ? await updateProductAction(existing.id, payload) : await createProductAction(payload);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setOpen(false);
      if (!existing) setForm(EMPTY);
      router.refresh();
    });
  }

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-900">{existing ? `Edit ${existing.sku}` : 'Add Item'}</p>
        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
          <X size={16} />
        </button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <input
          value={form.sku}
          onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
          placeholder="SKU"
          disabled={!!existing}
          className="rounded-lg border border-slate-200 px-2.5 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-400"
        />
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Product name"
          className="rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
        />
        <input
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Description (optional)"
          className="rounded-lg border border-slate-200 px-2.5 py-2 text-sm sm:col-span-2"
        />
        <input
          value={form.hsnCode}
          onChange={(e) => setForm((f) => ({ ...f, hsnCode: e.target.value }))}
          placeholder="HSN code"
          className="rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
        />
        <select
          value={form.gstRate}
          onChange={(e) => setForm((f) => ({ ...f, gstRate: Number(e.target.value) }))}
          className="rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
        >
          {GST_RATES.map((r) => (
            <option key={r} value={r}>
              GST {r}%
            </option>
          ))}
        </select>
        <input
          type="number"
          value={form.sellingPrice}
          onChange={(e) => setForm((f) => ({ ...f, sellingPrice: e.target.value }))}
          placeholder="Selling price (₹)"
          className="rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
        />
        <input
          value={form.unit}
          onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
          placeholder="Unit (PCS, KG, BOX...)"
          className="rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
        />
        <select
          value={form.fulfillmentType}
          onChange={(e) => setForm((f) => ({ ...f, fulfillmentType: e.target.value as FulfillmentType }))}
          className="rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
        >
          {FULFILLMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          value={form.minCustomerMoq}
          onChange={(e) => setForm((f) => ({ ...f, minCustomerMoq: Math.max(1, Number(e.target.value)) }))}
          placeholder="Min. order qty"
          className="rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
        />
        <input
          type="number"
          min={0}
          value={form.warehouseStock}
          onChange={(e) => setForm((f) => ({ ...f, warehouseStock: Math.max(0, Number(e.target.value)) }))}
          placeholder="Warehouse stock"
          className="rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
        />

        <div className="sm:col-span-2">
          {!showNewCategory ? (
            <div className="flex items-center gap-2">
              <select
                value={form.categoryId}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                className="flex-1 rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
              >
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowNewCategory(true)}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                <Plus size={12} /> New
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="New category name"
                className="flex-1 rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
              />
              <button onClick={addCategory} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white">
                Add
              </button>
              <button onClick={() => setShowNewCategory(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        {existing && (
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active (visible in the catalog)
          </label>
        )}
      </div>

      <button
        onClick={submit}
        disabled={pending}
        className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
      >
        {pending && <Loader2 size={14} className="animate-spin" />}
        {existing ? 'Save Changes' : 'Save Item'}
      </button>
      {error && <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}
    </div>
  );
}
