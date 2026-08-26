import { ShieldCheck, GitBranch, FileSpreadsheet, Truck, User, Mail, Lock, Phone, Building2, AlertCircle } from 'lucide-react';
import { signupAction } from '@/lib/actions/auth';
import { SubmitButton } from '@/components/auth/submit-button';

const FEATURES = [
  { icon: GitBranch, text: 'Multi-vendor dropship routing, automatically to the cheapest supplier' },
  { icon: FileSpreadsheet, text: 'GST-compliant invoicing with CGST/SGST/IGST handled for you' },
  { icon: Truck, text: 'Live shipment tracking with a 24-hour dispute window' },
];

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-dvh bg-slate-50">
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
          <h1 className="max-w-md text-3xl font-extrabold leading-tight text-white">Create your customer account.</h1>
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
          Vendors don&apos;t sign up here — they receive a direct link by SMS/WhatsApp for each purchase order.
        </p>
      </div>

      <div className="flex w-full flex-col items-center justify-center px-6 py-16 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="text-white" size={18} strokeWidth={2.5} />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">ChainSync</span>
          </div>

          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Create your account</h2>
          <p className="mt-1.5 text-sm text-slate-500">Start ordering in a couple of minutes.</p>

          <form action={signupAction} className="mt-6 space-y-3">
            <Field icon={User} name="name" type="text" placeholder="Full name" required autoFocus />
            <Field icon={Mail} name="email" type="email" placeholder="you@company.com" required />
            <Field icon={Phone} name="phone" type="tel" placeholder="Phone (optional)" />
            <Field icon={Lock} name="password" type="password" placeholder="Password (min. 8 characters)" required minLength={8} />

            <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 p-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="customerType" value="B2C" defaultChecked /> Individual
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="customerType" value="B2B" /> Business
              </label>
            </div>

            <Field icon={Building2} name="legalName" type="text" placeholder="Business / legal name (optional)" />
            <Field icon={FileSpreadsheet} name="gstin" type="text" placeholder="GSTIN (required for Business)" />

            <div className="grid grid-cols-2 gap-3">
              <input
                name="state"
                type="text"
                required
                placeholder="State"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
              />
              <input
                name="stateCode"
                type="text"
                required
                placeholder="GST state code (e.g. 27)"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{decodeURIComponent(error)}</span>
              </div>
            )}

            <SubmitButton />
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <a href="/login" className="font-bold text-indigo-600 hover:text-indigo-700">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}

function Field({
  icon: Icon,
  name,
  type,
  placeholder,
  required,
  autoFocus,
  minLength,
}: {
  icon: typeof User;
  name: string;
  type: string;
  placeholder: string;
  required?: boolean;
  autoFocus?: boolean;
  minLength?: number;
}) {
  return (
    <div className="relative">
      <Icon size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        name={name}
        type={type}
        required={required}
        autoFocus={autoFocus}
        minLength={minLength}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm text-slate-900 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
      />
    </div>
  );
}
