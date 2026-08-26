import { redirect } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { Star, Phone, Mail, MapPin, Package, FileText, Building2 } from 'lucide-react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/layout/app-shell';

const STAFF_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.PROCUREMENT_MAKER,
  UserRole.PROCUREMENT_CHECKER,
  UserRole.FINANCE,
];

export default async function VendorsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login?callbackUrl=/vendors');
  if (!STAFF_ROLES.includes(session.user.role)) redirect('/');

  const vendors = await prisma.vendor.findMany({
    include: { _count: { select: { catalogs: true, purchaseOrders: true } } },
    orderBy: { displayName: 'asc' },
  });

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl px-6 py-10 pb-24">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md">
            <Building2 size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Vendors</h1>
            <p className="text-sm text-slate-500">{vendors.length} registered supplier(s).</p>
          </div>
        </div>

        {vendors.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
            No vendors registered yet.
          </p>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vendors.map((vendor) => (
              <div
                key={vendor.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:shadow-lg hover:shadow-slate-900/5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900">{vendor.displayName}</p>
                    <p className="truncate text-xs text-slate-400">{vendor.legalName}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                      vendor.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {vendor.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-1">
                  <Star size={14} className="fill-amber-400 text-amber-400" />
                  <span className="text-sm font-bold text-slate-700">{vendor.rating.toString()}</span>
                  <span className="text-xs text-slate-400">/ 5.0 rating</span>
                </div>

                <div className="mt-4 space-y-1.5 text-sm text-slate-600">
                  <p className="flex items-center gap-2">
                    <Phone size={14} className="shrink-0 text-slate-400" />
                    {vendor.phone}
                  </p>
                  {vendor.email && (
                    <p className="flex items-center gap-2">
                      <Mail size={14} className="shrink-0 text-slate-400" />
                      <span className="truncate">{vendor.email}</span>
                    </p>
                  )}
                  <p className="flex items-center gap-2">
                    <MapPin size={14} className="shrink-0 text-slate-400" />
                    {vendor.state}
                  </p>
                  {vendor.gstin && (
                    <p className="flex items-center gap-2">
                      <FileText size={14} className="shrink-0 text-slate-400" />
                      {vendor.gstin}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-xs font-semibold text-slate-500">
                  <Package size={14} />
                  {vendor._count.catalogs} product{vendor._count.catalogs === 1 ? '' : 's'} listed &middot;{' '}
                  {vendor._count.purchaseOrders} PO{vendor._count.purchaseOrders === 1 ? '' : 's'}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </AppShell>
  );
}
