'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Camera, Loader2, X } from 'lucide-react';
import { raiseDisputeAction, uploadDisputePhotoAction } from '@/lib/actions/dispute';

const REASONS = ['DAMAGED', 'MISSING', 'WRONG_ITEM', 'QUALITY_ISSUE', 'OTHER'] as const;

interface DisputableItem {
  orderItemId: string;
  name: string;
  quantity: number;
}

interface PhotoUpload {
  id: string;
  name: string;
  url: string | null;
  uploading: boolean;
}

export function DisputeForm({
  orderId,
  shipmentId,
  items,
}: {
  orderId: string;
  shipmentId: string;
  items: DisputableItem[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [reason, setReason] = useState<(typeof REASONS)[number]>('DAMAGED');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<PhotoUpload[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-2 flex items-center gap-1.5 text-xs font-bold text-rose-600">
        <AlertTriangle size={14} /> Report a problem
      </button>
    );
  }

  function handlePhotoSelect(files: FileList | null) {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      // A stable client-side id (not the filename, which two selected files can share) so
      // the upload result and remove-button can unambiguously target this exact entry.
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setPhotos((prev) => [...prev, { id, name: file.name, url: null, uploading: true }]);

      const formData = new FormData();
      formData.set('file', file);
      uploadDisputePhotoAction(formData)
        .then(({ url }) => {
          setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, url, uploading: false } : p)));
        })
        .catch(() => {
          setPhotos((prev) => prev.filter((p) => p.id !== id));
          setError(`Could not upload ${file.name}.`);
        });
    }
  }

  function removePhoto(id: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }

  function submit() {
    setError(null);
    const chosen = items.filter((i) => selected[i.orderItemId]);
    if (chosen.length === 0) return setError('Select at least one affected item.');
    if (!description.trim()) return setError('Describe what happened.');
    if (photos.some((p) => p.uploading)) return setError('Wait for photo uploads to finish.');

    const photoUrls = photos.map((p) => p.url).filter((url): url is string => url !== null);

    startTransition(async () => {
      try {
        await raiseDisputeAction(
          orderId,
          shipmentId,
          description,
          chosen.map((i) => ({ orderItemId: i.orderItemId, reason, quantity: i.quantity, photoUrls }))
        );
        router.refresh();
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not submit your report.');
      }
    });
  }

  return (
    <div className="mt-3 space-y-3 rounded-xl bg-slate-50 p-3">
      <div>
        <p className="text-xs font-bold text-slate-600">Affected items</p>
        <ul className="mt-1 space-y-1">
          {items.map((item) => (
            <li key={item.orderItemId} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!selected[item.orderItemId]}
                onChange={(e) => setSelected((prev) => ({ ...prev, [item.orderItemId]: e.target.checked }))}
              />
              {item.name} (qty {item.quantity})
            </li>
          ))}
        </ul>
      </div>

      <div>
        <label className="text-xs font-bold text-slate-600">Reason</label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value as (typeof REASONS)[number])}
          className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
        >
          {REASONS.map((r) => (
            <option key={r} value={r}>
              {r.replaceAll('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-bold text-slate-600">What happened?</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
        />
      </div>

      <div>
        <label className="text-xs font-bold text-slate-600">Photos (optional)</label>
        <label className="mt-1 flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-2 text-xs font-semibold text-slate-500 hover:border-rose-300 hover:text-rose-600">
          <Camera size={14} /> Attach photos
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handlePhotoSelect(e.target.files)} />
        </label>
        {photos.length > 0 && (
          <ul className="mt-2 space-y-1">
            {photos.map((p) => (
              <li key={p.id} className="flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  {p.uploading && <Loader2 size={12} className="animate-spin" />}
                  {p.name}
                </span>
                <button onClick={() => removePhoto(p.id)} className="text-slate-400 hover:text-rose-600">
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={submit}
          disabled={pending}
          className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
        >
          {pending && <Loader2 size={14} className="animate-spin" />}
          Submit report
        </button>
        <button onClick={() => setOpen(false)} className="text-xs font-semibold text-slate-500">
          Cancel
        </button>
      </div>
    </div>
  );
}
