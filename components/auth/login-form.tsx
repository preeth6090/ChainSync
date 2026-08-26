'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Loader2 } from 'lucide-react';

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    if (!email || !password) {
      setError('Enter both email and password.');
      return;
    }

    startTransition(async () => {
      const result = await signIn('credentials', { email, password, redirect: false });
      if (!result || result.error) {
        setError('Incorrect email or password.');
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="mt-6 space-y-3"
    >
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
        required
        placeholder="you@company.com"
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
      />
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        type="password"
        required
        placeholder="Password"
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
      />
      {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {pending && <Loader2 size={16} className="animate-spin" />}
        Sign in
      </button>
    </form>
  );
}
