'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { AuthError } from 'next-auth';
import { CustomerType } from '@prisma/client';
import { signIn, signOut } from '@/lib/auth';
import { registerCustomer } from '@/lib/services/signup';
import { requireUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { ACTIVE_FIRM_COOKIE } from '@/lib/services/firm-context';

// Server-action sign-in rather than the client-side next-auth/react signIn() call: that
// helper generally expects the app to be wrapped in a <SessionProvider>, which this app
// doesn't have (no page actually needs a live client-side session — every protected page
// checks auth() server-side). This form-post pattern needs no client auth context at all.
export async function loginAction(formData: FormData) {
  const email = formData.get('email');
  const password = formData.get('password');
  const callbackUrl = (formData.get('callbackUrl') as string) || '/';

  try {
    await signIn('credentials', { email, password, redirectTo: callbackUrl });
  } catch (error) {
    // signIn() itself throws a redirect signal on success (that's how Next.js redirects
    // work from a Server Action) — only a real AuthError means the credentials were wrong.
    if (error instanceof AuthError) {
      redirect(`/login?error=1&callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: '/' });
}

// Sets which firm subsequent requests operate on — see lib/services/firm-context.ts. Rejects
// switching to a firm the user isn't a member of rather than trusting the client-supplied id.
export async function switchFirmAction(companyId: string) {
  const user = await requireUser();
  const membership = await prisma.userFirm.findUnique({
    where: { userId_companyId: { userId: user.id, companyId } },
  });
  if (!membership) throw new Error('You do not have access to this firm.');

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_FIRM_COOKIE, companyId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function signupAction(formData: FormData) {
  const name = String(formData.get('name') ?? '');
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const phone = String(formData.get('phone') ?? '');
  const customerType = formData.get('customerType') === 'B2B' ? CustomerType.B2B : CustomerType.B2C;
  const legalName = String(formData.get('legalName') ?? '');
  const gstin = String(formData.get('gstin') ?? '');
  const stateCode = String(formData.get('stateCode') ?? '');
  const state = String(formData.get('state') ?? '');

  try {
    await registerCustomer({ name, email, password, phone, customerType, legalName, gstin, stateCode, state });
  } catch (error) {
    if (error instanceof Error) {
      redirect(`/signup?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }

  try {
    await signIn('credentials', { email, password, redirectTo: '/' });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect('/login?callbackUrl=/');
    }
    throw error;
  }
}
