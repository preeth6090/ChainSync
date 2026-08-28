import { UserRole } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getActiveCompanyId } from '@/lib/services/firm-context';

export class UnauthenticatedError extends Error {}
export class ForbiddenError extends Error {}

// Every server action that mutates state should call this (or requireRole/requireCustomer)
// instead of trusting a userId/customerId passed in from the client — the session is the
// only thing the caller can't forge.
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthenticatedError('You must be signed in.');
  return session.user;
}

export async function requireRole(...roles: UserRole[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw new ForbiddenError('You are not authorized to perform this action.');
  }
  return user;
}

export async function requireCustomer() {
  const user = await requireUser();
  const customer = await prisma.customer.findUnique({ where: { userId: user.id } });
  if (!customer) throw new ForbiddenError('No customer profile is linked to this account.');
  return customer;
}

// Like requireRole, but also resolves which firm the action should operate on — the active
// firm from the switcher cookie for a staff user with several memberships, or their one and
// only membership otherwise. Use this instead of requireRole for any action that reads or
// writes a company-scoped table (Product, Order, Invoice, Vendor, etc.).
export async function requireRoleWithCompany(...roles: UserRole[]) {
  const user = await requireRole(...roles);
  const companyId = await getActiveCompanyId(user.id);
  return { ...user, companyId };
}
