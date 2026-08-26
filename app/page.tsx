import Link from 'next/link';
import {
  ClipboardList,
  ShoppingBag,
  ShieldCheck,
  Building2,
  ArrowRight,
  Package,
  Users,
  FileSpreadsheet,
  GitBranch,
  Truck,
} from 'lucide-react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SiteHeader } from '@/components/layout/site-header';

const MODULES = [
  {
    href: '/catalog',
    title: 'Catalog',
    description: 'Browse products across every fulfillment type and add items to your cart.',
    icon: ShoppingBag,
    accent: 'from-indigo-500 to-blue-500',
  },
  {
    href: '/orders',
    title: 'Your Orders',
    description: 'Track shipments live, report issues within the 24-hour window, and pay invoices.',
    icon: ClipboardList,
    accent: 'from-emerald-500 to-teal-500',
  },
  {
    href: '/vendors',
    title: 'Vendors',
    description: 'The full supplier directory — ratings, catalogs, GST details, and contacts.',
    icon: Building2,
    accent: 'from-amber-500 to-orange-500',
  },
  {
    href: '/procurement',
    title: 'Procurement Desk',
    description: 'Maker-checker approvals, MOQ exceptions, disputes, and vendor bill matching.',
    icon: ShieldCheck,
    accent: 'from-purple-500 to-fuchsia-500',
  },
];

const HIGHLIGHTS = [
  { icon: GitBranch, text: 'Multi-vendor dropship routing to the cheapest eligible supplier' },
  { icon: FileSpreadsheet, text: 'GST-native invoicing — CGST/SGST/IGST computed automatically' },
  { icon: Truck, text: 'Live tracking with a 24-hour post-delivery dispute window' },
];

export default async function HomePage() {
  const session = await auth();

  const [productCount, vendorCount, customerCount, orderCount] = await Promise.all([
    prisma.product.count({ where: { isActive: true } }),
    prisma.vendor.count({ where: { isActive: true } }),
    prisma.customer.count(),
    prisma.order.count(),
  ]);

  const stats = [
    { label: 'Active products', value: productCount, icon: Package },
    { label: 'Registered vendors', value: vendorCount, icon: Building2 },
    { label: 'Customers onboarded', value: customerCount, icon: Users },
    { label: 'Orders placed', value: orderCount, icon: ClipboardList },
  ];

  return (
    <div className="min-h-dvh bg-slate-50">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-purple-400/20 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-6 py-20">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-200">B2B Order Management</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
            One system for orders, vendors, and GST invoicing.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-indigo-100">
            Route every order to a warehouse or the cheapest vendor automatically, keep procurement
            honest with maker-checker approvals, and never hand-calculate GST again.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/catalog"
              className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-indigo-700 shadow-lg transition hover:shadow-xl"
            >
              Browse Catalog <ArrowRight size={16} />
            </Link>
            {!session?.user && (
              <Link
                href="/login"
                className="flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                Sign in
              </Link>
            )}
          </div>

          <ul className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-8">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-2.5 sm:max-w-[220px]">
                <Icon size={16} className="mt-0.5 shrink-0 text-indigo-300" />
                <span className="text-xs leading-relaxed text-indigo-100">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto -mt-8 max-w-6xl px-6">
        <div className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-900/5 sm:grid-cols-4">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Icon size={18} />
              </div>
              <div>
                <p className="text-xl font-extrabold text-slate-900">{value}</p>
                <p className="text-xs font-medium text-slate-500">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Modules */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-xl font-extrabold text-slate-900">Everything in one place</h2>
        <p className="mt-1 text-sm text-slate-500">Jump straight to the part of the system you need.</p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {MODULES.map(({ href, title, description, icon: Icon, accent }) => (
            <Link
              key={href}
              href={href}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/5"
            >
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-md`}
              >
                <Icon size={20} />
              </div>
              <p className="mt-4 flex items-center gap-1.5 text-base font-bold text-slate-900">
                {title}
                <ArrowRight size={15} className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-500" />
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
