import { ShieldCheck, Truck, FileSpreadsheet, GitBranch, Mail, Lock, AlertCircle } from 'lucide-react';
import { loginAction } from '@/lib/actions/auth';
import { SubmitButton } from '@/components/auth/submit-button';

const FEATURES = [
  { icon: GitBranch, text: 'Multi-vendor dropship routing, automatically to the cheapest supplier' },
  { icon: FileSpreadsheet, text: 'GST-compliant invoicing with CGST/SGST/IGST handled for you' },
  { icon: Truck, text: 'Live shipment tracking with a 24-hour dispute window' },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { callbackUrl, error } = await searchParams;

  return (
    <main className="flex min-h-dvh bg-slate-50">
      {/* Branding panel */}
      <div className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-purple-400/20 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 shadow-lg backdrop-blur-sm">
            <ShieldCheck className="text-white" size={22} strokeWidth={2.5} />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">ChainSync</span>
        </div>

        <div className="relative">
          <h1 className="max-w-md text-3xl font-extrabold leading-tight text-white">
            One system for orders, vendors, and GST invoicing.
          </h1>
          <ul className="mt-8 space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
                  <Icon size={16} className="text-white" />
                </div>
                <span className="text-sm leading-relaxed text-indigo-100">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-indigo-200/70">
          Vendors don&apos;t sign in here — they receive a direct link by SMS/WhatsApp for each purchase order.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex w-full flex-col items-center justify-center px-6 py-16 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="text-white" size={18} strokeWidth={2.5} />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">ChainSync</span>
          </div>

          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Welcome back</h2>
          <p className="mt-1.5 text-sm text-slate-500">Sign in with your email and password.</p>

          <form action={loginAction} className="mt-8 space-y-4">
            <input type="hidden" name="callbackUrl" value={callbackUrl ?? '/'} />

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Email</label>
              <div className="relative">
                <Mail size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  name="email"
                  type="email"
                  required
                  autoFocus
                  placeholder="you@company.com"
                  className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm text-slate-900 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Password</label>
              <div className="relative">
                <Lock size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm text-slate-900 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>Incorrect email or password.</span>
              </div>
            )}

            <SubmitButton />
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            New customer?{' '}
            <a href="/signup" className="font-bold text-indigo-600 hover:text-indigo-700">
              Create an account
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
