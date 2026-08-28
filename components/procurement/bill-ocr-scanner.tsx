'use client';

import { useState } from 'react';
import { ScanLine, Loader2, CheckCircle2 } from 'lucide-react';
import { extractBillFields, type OcrExtraction } from '@/lib/services/ocr-extraction';

export type { OcrExtraction };

export function BillOcrScanner({ onExtracted }: { onExtracted: (result: OcrExtraction) => void }) {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setDone(false);
    setScanning(true);
    setProgress(0);

    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') setProgress(Math.round(m.progress * 100));
        },
      });
      const { data } = await worker.recognize(file);
      await worker.terminate();

      const extraction = extractBillFields(data.text);
      onExtracted(extraction);
      setDone(true);
    } catch {
      setError('Could not read this image. Try a clearer photo or enter details manually.');
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/50 p-3">
      <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-indigo-700">
        {scanning ? <Loader2 size={14} className="animate-spin" /> : done ? <CheckCircle2 size={14} /> : <ScanLine size={14} />}
        {scanning ? `Scanning… ${progress}%` : done ? 'Scanned — fields filled below, please verify' : 'Scan a bill photo (OCR)'}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          disabled={scanning}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </label>
      {error && <p className="mt-1 text-[11px] font-semibold text-rose-600">{error}</p>}
    </div>
  );
}
