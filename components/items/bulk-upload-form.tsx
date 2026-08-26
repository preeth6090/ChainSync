'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Upload, Download, CheckCircle2, AlertTriangle } from 'lucide-react';
import { bulkImportItemsAction, type BulkImportActionResult } from '@/lib/actions/items';

export function BulkUploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<Extract<BulkImportActionResult, { success: true }>['data'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
      >
        <Upload size={14} /> Bulk Upload
      </button>
    );
  }

  function handleFile(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    setError(null);
    setResult(null);
    startTransition(async () => {
      const outcome = await bulkImportItemsAction(file);
      if (!outcome.success) {
        setError(outcome.error);
        return;
      }
      setResult(outcome.data);
      router.refresh();
    });
  }

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-bold text-slate-900">Bulk Upload Items</p>
      <p className="mt-1 text-xs text-slate-500">
        Upload an Excel file to create or update many items at once — matched by SKU. Existing SKUs are updated in place.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <a
          href="/api/items/template"
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          <Download size={14} /> Download Template
        </a>

        <button
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {fileName ? fileName : 'Choose Excel File'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        <button onClick={() => setOpen(false)} className="text-xs font-bold text-slate-400 hover:text-slate-600">
          Close
        </button>
      </div>

      {error && (
        <p className="mt-3 flex items-start gap-1.5 text-xs font-semibold text-rose-600">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {error}
        </p>
      )}

      {result && (
        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs">
          <p className="flex items-center gap-1.5 font-bold text-emerald-700">
            <CheckCircle2 size={14} /> {result.created} created, {result.updated} updated.
          </p>
          {result.errors.length > 0 && (
            <div className="mt-2">
              <p className="font-bold text-rose-600">{result.errors.length} row(s) skipped:</p>
              <ul className="mt-1 max-h-32 space-y-0.5 overflow-y-auto text-slate-500">
                {result.errors.map((e, i) => (
                  <li key={i}>
                    Row {e.row}: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
