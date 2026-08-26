import { signIn } from '@/lib/auth';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-extrabold text-slate-900">Sign in to ChainSync</h1>
        <p className="mt-1 text-sm text-slate-500">We&apos;ll email you a magic link — no password needed.</p>

        <form
          action={async (formData) => {
            'use server';
            const email = formData.get('email');
            if (typeof email !== 'string' || !email) return;
            await signIn('nodemailer', { email, redirectTo: callbackUrl ?? '/' });
          }}
          className="mt-6 space-y-3"
        >
          <input
            name="email"
            type="email"
            required
            placeholder="you@company.com"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700"
          >
            Send magic link
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Vendors don&apos;t sign in here — you receive a direct link by SMS/WhatsApp for each purchase order.
        </p>
      </div>
    </main>
  );
}
