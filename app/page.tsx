import Link from 'next/link';
import { ClipboardList, ShoppingBag, ShieldCheck, LogIn } from 'lucide-react';

const LINKS = [
  {
    href: '/catalog',
    title: 'Catalog',
    description: 'Browse products and add items to your cart.',
    icon: ShoppingBag,
  },
  {
    href: '/orders',
    title: 'Your Orders',
    description: 'Track shipments, report issues, and pay invoices.',
    icon: ClipboardList,
  },
  {
    href: '/procurement',
    title: 'Procurement Desk',
    description: 'Maker-checker approvals, disputes, and vendor bills (staff only).',
    icon: ShieldCheck,
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">ChainSync</p>
      <h1 className="mt-1 text-3xl font-extrabold text-slate-900">B2B Order Management</h1>
      <p className="mt-2 text-sm text-slate-500">
        Multi-vendor dropship routing, GST invoicing, and procurement — all in one place.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {LINKS.map(({ href, title, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-indigo-300 hover:shadow-sm"
          >
            <Icon className="text-indigo-600" size={22} />
            <p className="mt-3 font-bold text-slate-900">{title}</p>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </Link>
        ))}
      </div>

      <Link
        href="/login"
        className="mt-8 flex w-fit items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
      >
        <LogIn size={16} /> Sign in
      </Link>
    </main>
  );
}
