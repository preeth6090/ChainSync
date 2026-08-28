'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ChevronsUpDown, Check, Loader2 } from 'lucide-react';
import { switchFirmAction } from '@/lib/actions/auth';

export interface FirmOption {
  companyId: string;
  legalName: string;
  isActive: boolean;
}

export function FirmSwitcher({ firms }: { firms: FirmOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const active = firms.find((f) => f.isActive) ?? firms[0];

  if (firms.length <= 1) {
    return (
      <div className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-bold text-slate-300">
        <Building2 size={14} className="shrink-0 text-slate-500" />
        <span className="truncate">{active?.legalName ?? 'No firm'}</span>
      </div>
    );
  }

  function select(companyId: string) {
    setOpen(false);
    startTransition(async () => {
      await switchFirmAction(companyId);
      router.refresh();
    });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs font-bold text-slate-200 hover:bg-white/5"
      >
        <Building2 size={14} className="shrink-0 text-indigo-400" />
        <span className="min-w-0 flex-1 truncate text-left">{active?.legalName ?? 'Choose firm'}</span>
        {pending ? <Loader2 size={13} className="animate-spin" /> : <ChevronsUpDown size={13} className="text-slate-500" />}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-1 w-full rounded-lg border border-white/10 bg-slate-800 py-1 shadow-xl">
          {firms.map((firm) => (
            <button
              key={firm.companyId}
              onClick={() => select(firm.companyId)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-200 hover:bg-white/5"
            >
              <Check size={13} className={firm.isActive ? 'text-emerald-400' : 'text-transparent'} />
              <span className="truncate">{firm.legalName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
