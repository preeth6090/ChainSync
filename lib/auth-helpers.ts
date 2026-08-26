import { UserRole } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
