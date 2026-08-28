import Link from 'next/link';
import { ShieldCheck, LogIn, LogOut } from 'lucide-react';
import { UserRole } from '@prisma/client';
import { auth } from '@/lib/auth';
import { logoutAction } from '@/lib/actions/auth';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { MobileSidebarToggle } from '@/components/layout/mobile-sidebar-toggle';
import { FirmSwitcher } from '@/components/layout/firm-switcher';
import { listUserFirms, getActiveCompanyId } from '@/lib/services/firm-context';

const STAFF_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.PROCUREMENT_MAKER, UserRole.PROCUREMENT_CHECKER, UserRole.FINANCE];

export async function SiteSidebar() {
  const session = await auth();
  const isStaff = !!session?.user && STAFF_ROLES.includes(session.user.role);

  let firmOptions: { companyId: string; legalName: string; isActive: boolean }[] = [];
  if (session?.user) {
    const [memberships, activeCompanyId] = await Promise.all([
      listUserFirms(session.user.id),
      getActiveCompanyId(session.user.id),
    ]);
    firmOptions = memberships.map((m) => ({
      companyId: m.companyId,
      legalName: m.company.legalName,
      isActive: m.companyId === activeCompanyId,
    }));
  }

  const body = (
    <div className="flex h-full flex-col bg-slate-900">
      <Link href="/" className="flex items-center gap-2.5 px-4 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/20">
          <ShieldCheck className="text-white" size={16} strokeWidth={2.5} />
        </div>
        <span className="text-base font-bold tracking-tight text-white">ChainSync</span>
      </Link>

      {session?.user && (
        <div className="px-3 pb-1">
          <FirmSwitcher firms={firmOptions} />
        </div>
      )}

      <SidebarNav isStaff={isStaff} />

      <div className="border-t border-white/10 p-3">
        {session?.user ? (
          <div className="flex items-center justify-between gap-2 rounded-lg px-2 py-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-white">{session.user.name ?? session.user.email}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-400">{session.user.role}</p>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-bold text-slate-300 transition hover:bg-white/5"
              >
                <LogOut size={13} />
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center justify-center gap-1.5 rounded-lg bg-white px-4 py-2.5 text-xs font-bold text-slate-900 transition hover:bg-slate-100"
          >
            <LogIn size={14} /> Sign in
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-slate-200/80 bg-slate-900 px-4 md:hidden">
        <MobileSidebarToggle>{body}</MobileSidebarToggle>
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
            <ShieldCheck className="text-white" size={14} strokeWidth={2.5} />
          </div>
          <span className="text-sm font-bold text-white">ChainSync</span>
        </Link>
      </div>

      {/* Desktop fixed sidebar */}
      <div className="hidden md:fixed md:inset-y-0 md:left-0 md:z-30 md:flex md:w-64">{body}</div>
    </>
  );
}
