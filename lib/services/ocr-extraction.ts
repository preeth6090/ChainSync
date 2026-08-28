export interface OcrExtraction {
  billNumber: string | null;
  amount: number | null;
  rawText: string;
}

// Field detection is plain regex over OCR-recognized text, not a document-understanding
// model — a starting point to review and correct, not an authoritative read. The bill-number
// pattern requires a No./Number/# marker or a colon/dash immediately after "invoice"/"bill",
// not just the bare word anywhere in the text (a bare match would fire on ordinary prose that
// happens to contain "invoice", e.g. "no invoice info at all").
export function extractBillFields(rawText: string): OcrExtraction {
  const billMatch = rawText.match(
    /(?:invoice|bill)\s*(?:(?:no\.?|number|#)\s*[:\-]?|[:\-])\s*([A-Za-z0-9][A-Za-z0-9\-\/]{2,20})/i
  );

  const amountMatches = [
    ...rawText.matchAll(/(?:total|amount|grand\s*total)[^\d₹]{0,15}(?:rs\.?|inr|₹)?\s*([\d,]+\.\d{0,2}|[\d,]{3,})/gi),
  ];
  let amount: number | null = null;
  if (amountMatches.length > 0) {
    const parsed = amountMatches.map((m) => Number(m[1].replace(/,/g, ''))).filter((n) => !Number.isNaN(n));
    if (parsed.length > 0) amount = Math.max(...parsed);
  }

  return { billNumber: billMatch ? billMatch[1] : null, amount, rawText };
}
