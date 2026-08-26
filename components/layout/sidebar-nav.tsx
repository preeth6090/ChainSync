'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  ShoppingBag,
  ClipboardList,
  Boxes,
  Users,
  Receipt,
  Truck,
  Landmark,
  BarChart3,
  ChevronDown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavLeaf {
  href: string;
  label: string;
  icon: LucideIcon;
  staffOnly: boolean;
}

interface NavGroup {
  label: string;
  icon: LucideIcon;
  staffOnly: boolean;
  children: { href: string; label: string }[];
}

type NavEntry = ({ type: 'link' } & NavLeaf) | ({ type: 'group' } & NavGroup);

const NAV: NavEntry[] = [
  { type: 'link', href: '/', label: 'Home', icon: Home, staffOnly: false },
  { type: 'link', href: '/catalog', label: 'Catalog', icon: ShoppingBag, staffOnly: false },
  { type: 'link', href: '/orders', label: 'Orders', icon: ClipboardList, staffOnly: false },
  { type: 'link', href: '/items', label: 'Items', icon: Boxes, staffOnly: true },
  { type: 'link', href: '/finance/parties', label: 'Parties', icon: Users, staffOnly: true },
  {
    type: 'group',
    label: 'Sale',
    icon: Receipt,
    staffOnly: true,
    children: [
      { href: '/finance/invoices', label: 'Sale Invoices' },
      { href: '/sales/quotations', label: 'Estimate / Quotation' },
      { href: '/orders', label: 'Sale Order' },
      { href: '/logistics/challans', label: 'Delivery Challan' },
      { href: '/sales/returns', label: 'Sale Return / Credit Note' },
    ],
  },
  {
    type: 'group',
    label: 'Purchase & Expense',
    icon: Truck,
    staffOnly: true,
    children: [
      { href: '/finance/purchases', label: 'Purchase & Expense' },
      { href: '/vendors', label: 'Vendors' },
      { href: '/procurement', label: 'Procurement' },
    ],
  },
  { type: 'link', href: '/finance/reports#cash-bank', label: 'Cash & Bank', icon: Landmark, staffOnly: true },
  { type: 'link', href: '/finance/reports#business-summary', label: 'Reports', icon: BarChart3, staffOnly: true },
];

function isActive(pathname: string, href: string): boolean {
  const path = href.split('#')[0];
  return path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`);
}

export function SidebarNav({ isStaff }: { isStaff: boolean }) {
  const pathname = usePathname();
  const entries = NAV.filter((e) => !e.staffOnly || isStaff);
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(entries.filter((e) => e.type === 'group' && e.children.some((c) => isActive(pathname, c.href))).map((e) => e.label))
  );

  function toggle(label: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
      {entries.map((entry) => {
        if (entry.type === 'link') {
          const active = isActive(pathname, entry.href);
          return (
            <Link
              key={entry.href}
              href={entry.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                active ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <entry.icon size={17} className={active ? 'text-indigo-400' : 'text-slate-400'} />
              {entry.label}
            </Link>
          );
        }

        const open = openGroups.has(entry.label);
        const groupActive = entry.children.some((c) => isActive(pathname, c.href));

        return (
          <div key={entry.label}>
            <button
              onClick={() => toggle(entry.label)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                groupActive ? 'text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <entry.icon size={17} className={groupActive ? 'text-indigo-400' : 'text-slate-400'} />
              <span className="flex-1 text-left">{entry.label}</span>
              <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
              <div className="ml-4 mt-0.5 space-y-0.5 border-l border-white/10 pl-4">
                {entry.children.map((child) => {
                  const active = isActive(pathname, child.href);
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                        active ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {child.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
