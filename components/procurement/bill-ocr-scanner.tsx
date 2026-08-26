'use client';

import { useState } from 'react';
import { ScanLine, Loader2, CheckCircle2 } from 'lucide-react';

export interface OcrExtraction {
  billNumber: string | null;
  amount: number | null;
  rawText: string;
}

// Runs entirely in the browser via tesseract.js (WASM Tesseract build) — no server round trip,
// no paid OCR API, no document ever leaves the vendor's machine. Field detection is plain
// regex over the recognized text, not a document-understanding model, so it's a starting
// point to review and correct, not an authoritative read — the form fields it fills stay
// fully editable.
function extractFields(rawText: string): OcrExtraction {
  const billMatch = rawText.match(
    /(?:invoice|bill)\s*(?:(?:no\.?|number|#)\s*[:\-]?|[:\-])\s*([A-Za-z0-9][A-Za-z0-9\-\/]{2,20})/i
  );

  const amountMatches = [...rawText.matchAll(/(?:total|amount|grand\s*total)[^\d₹]{0,15}(?:rs\.?|inr|₹)?\s*([\d,]+\.\d{0,2}|[\d,]{3,})/gi)];
  let amount: number | null = null;
  if (amountMatches.length > 0) {
    const parsed = amountMatches.map((m) => Number(m[1].replace(/,/g, ''))).filter((n) => !Number.isNaN(n));
    if (parsed.length > 0) amount = Math.max(...parsed);
  }

  return { billNumber: billMatch ? billMatch[1] : null, amount, rawText };
}

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

      const extraction = extractFields(data.text);
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
