import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const ACTIVE_FIRM_COOKIE = 'active_firm_id';

export class NoActiveFirmError extends Error {}

interface MembershipLike {
  companyId: string;
  isDefault: boolean;
}

// Pure resolution logic, split out from getActiveCompanyId so it's directly unit-testable
// without a Next.js request context (next/headers' cookies() only works inside one). There is
// no fallback to "the first firm in the database" — an account with zero memberships is a
// real error, not silently defaulted, since operating on the wrong firm's data is far worse
// than a visible failure.
export function resolveActiveCompanyId(memberships: MembershipLike[], activeCookieValue?: string): string {
  if (memberships.length === 0) {
    throw new NoActiveFirmError('This account is not a member of any firm.');
  }
  if (activeCookieValue && memberships.some((m) => m.companyId === activeCookieValue)) {
    return activeCookieValue;
  }
  return (memberships.find((m) => m.isDefault) ?? memberships[0]).companyId;
}

// Every authenticated user — staff and customers alike — has at least one UserFirm row (the
// original multi-firm migration backfilled one for everybody against the sole pre-existing
// firm). A customer or vendor-portal account only ever has exactly one, so this resolves to
// it trivially regardless of cookie state; staff can belong to several and switch between
// them, which is what the cookie is for.
export async function getActiveCompanyId(userId: string): Promise<string> {
  const memberships = await prisma.userFirm.findMany({ where: { userId } });
  if (memberships.length === 0) {
    throw new NoActiveFirmError('This account is not a member of any firm.');
  }

  const cookieStore = await cookies();
  const activeCookie = cookieStore.get(ACTIVE_FIRM_COOKIE)?.value;
  return resolveActiveCompanyId(memberships, activeCookie);
}

export async function listUserFirms(userId: string) {
  return prisma.userFirm.findMany({
    where: { userId },
    include: { company: { select: { id: true, legalName: true } } },
    orderBy: { createdAt: 'asc' },
  });
}
