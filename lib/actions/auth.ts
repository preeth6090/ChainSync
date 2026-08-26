'use server';

import { redirect } from 'next/navigation';
import { AuthError } from 'next-auth';
import { signIn, signOut } from '@/lib/auth';

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
