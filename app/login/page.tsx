import { LoginForm } from '@/components/auth/login-form';

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
        <p className="mt-1 text-sm text-slate-500">Enter your email and password.</p>

        <LoginForm callbackUrl={callbackUrl ?? '/'} />

        <p className="mt-6 text-center text-xs text-slate-400">
          Vendors don&apos;t sign in here — you receive a direct link by SMS/WhatsApp for each purchase order.
        </p>
      </div>
    </main>
  );
}
