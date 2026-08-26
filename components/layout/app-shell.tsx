import type { ReactNode } from 'react';
import { SiteSidebar } from '@/components/layout/site-sidebar';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-slate-50">
      <SiteSidebar />
      <main className="min-w-0 md:pl-64">{children}</main>
    </div>
  );
}
