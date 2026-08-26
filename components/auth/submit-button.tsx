'use client';

import { useFormStatus } from 'react-dom';
import { Loader2, ArrowRight } from 'lucide-react';

export function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:shadow-xl hover:shadow-indigo-600/30 active:scale-[0.99] disabled:opacity-60"
    >
      {pending ? (
        <Loader2 size={18} className="animate-spin" />
      ) : (
        <>
          Sign in
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
        </>
      )}
    </button>
  );
}
