import { prisma } from '@/lib/prisma';
import { formatInr, formatNumber } from '@/lib/format';
import { AddToCartButton } from '@/components/catalog/add-to-cart-button';

// Stock and pricing change frequently (routing decrements warehouseStock on every order),
// and this page has no auth/params to otherwise force per-request rendering — without this,
// Next.js would statically prerender it once at build time and serve stale stock to every
// visitor until the next deploy.
export const dynamic = 'force-dynamic';

export default async function CatalogPage() {
  const products = await prisma.product.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-extrabold text-slate-900">Catalog</h1>
      {products.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-400">
          No active products yet.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <div key={product.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="font-bold text-slate-900">{product.name}</p>
              <p className="text-xs text-slate-400">
                {product.sku} &middot; HSN {product.hsnCode}
              </p>
              <p className="mt-2 text-lg font-extrabold text-slate-900">{formatInr(product.sellingPrice)}</p>
              <p className="text-xs text-slate-400">
                GST {formatNumber(product.gstRate)}% &middot; MOQ {product.minCustomerMoq}
              </p>
              <AddToCartButton
                productId={product.id}
                name={product.name}
                sku={product.sku}
                unitPrice={product.sellingPrice.toNumber()}
                minCustomerMoq={product.minCustomerMoq}
              />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
