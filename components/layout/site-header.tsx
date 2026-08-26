import Link from 'next/link';
import { ShieldCheck, LogIn, LogOut } from 'lucide-react';
import { UserRole } from '@prisma/client';
import { auth } from '@/lib/auth';
import { logoutAction } from '@/lib/actions/auth';

const STAFF_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.PROCUREMENT_MAKER, UserRole.PROCUREMENT_CHECKER, UserRole.FINANCE];

const NAV_LINKS = [
  { href: '/catalog', label: 'Catalog', staffOnly: false },
  { href: '/orders', label: 'Orders', staffOnly: false },
  { href: '/vendors', label: 'Vendors', staffOnly: true },
  { href: '/procurement', label: 'Procurement', staffOnly: true },
  { href: '/finance/invoices', label: 'Billing', staffOnly: true },
  { href: '/finance/parties', label: 'Parties', staffOnly: true },
  { href: '/finance/purchases', label: 'Purchase & Expense', staffOnly: true },
];

export async function SiteHeader() {
  const session = await auth();
  const isStaff = !!session?.user && STAFF_ROLES.includes(session.user.role);
  const links = NAV_LINKS.filter((link) => !link.staffOnly || isStaff);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/20">
            <ShieldCheck className="text-white" size={16} strokeWidth={2.5} />
          </div>
          <span className="text-base font-bold tracking-tight text-slate-900">ChainSync</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {session?.user ? (
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-bold text-slate-800">{session.user.name ?? session.user.email}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-500">{session.user.role}</p>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
              >
                <LogOut size={14} /> <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
          >
            <LogIn size={14} /> Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
