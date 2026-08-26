import { redirect } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { Boxes } from 'lucide-react';
import { auth } from '@/lib/auth';
import { listProductsForAdmin } from '@/lib/services/items';
import { listCategories } from '@/lib/services/items';
import { AppShell } from '@/components/layout/app-shell';
import { ProductForm } from '@/components/items/product-form';

const ITEM_MANAGER_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.PROCUREMENT_MAKER];

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });

export default async function ItemsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login?callbackUrl=/items');
  if (!ITEM_MANAGER_ROLES.includes(session.user.role)) redirect('/');

  const [products, categories] = await Promise.all([listProductsForAdmin(), listCategories()]);
  const categoryOptions = categories.map((c) => ({ id: c.id, name: c.name }));

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl px-6 py-10 pb-24">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-md">
            <Boxes size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Items</h1>
            <p className="text-sm text-slate-500">{products.length} product(s) in the catalog.</p>
          </div>
        </div>

        <div className="mt-6">
          <ProductForm categories={categoryOptions} trigger="add" />
        </div>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          {products.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-400">No items yet — add your first one above.</p>
          ) : (
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-right">Stock</th>
                  <th className="px-4 py-3">Fulfillment</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-900">{p.sku}</td>
                    <td className="px-4 py-3 text-slate-700">{p.name}</td>
                    <td className="px-4 py-3 text-slate-500">{p.category?.name ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900">
                      {inr.format(Number(p.sellingPrice))}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-slate-700">
                      {p.warehouseStock} {p.unit}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{p.fulfillmentType.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          p.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {p.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ProductForm
                        categories={categoryOptions}
                        trigger="edit"
                        existing={{
                          id: p.id,
                          sku: p.sku,
                          name: p.name,
                          description: p.description,
                          hsnCode: p.hsnCode,
                          gstRate: Number(p.gstRate),
                          sellingPrice: Number(p.sellingPrice),
                          fulfillmentType: p.fulfillmentType,
                          minCustomerMoq: p.minCustomerMoq,
                          warehouseStock: p.warehouseStock,
                          unit: p.unit,
                          categoryId: p.categoryId,
                          isActive: p.isActive,
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </AppShell>
  );
}
