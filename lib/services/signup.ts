import bcrypt from 'bcryptjs';
import { UserRole, CustomerType } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export interface CustomerSignupInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  customerType: CustomerType;
  legalName?: string;
  gstin?: string;
  stateCode: string;
  state: string;
}

// Creates the User + Customer profile together — a User without a linked Customer row can
// authenticate but requireCustomer() (used by every cart/checkout action) rejects it, so a
// half-finished signup would look like a working login that mysteriously can't order anything.
export async function registerCustomer(input: CustomerSignupInput) {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();

  if (!name) throw new Error('Name is required.');
  if (!email) throw new Error('Email is required.');
  if (input.password.length < 8) throw new Error('Password must be at least 8 characters.');
  if (!input.stateCode.trim() || !input.state.trim()) throw new Error('State is required.');
  if (input.customerType === CustomerType.B2B && !input.gstin?.trim()) {
    throw new Error('GSTIN is required for a business account.');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error('An account with this email already exists. Try signing in instead.');

  const passwordHash = await bcrypt.hash(input.password, 10);

  return prisma.user.create({
    data: {
      name,
      email,
      phone: input.phone?.trim() || undefined,
      passwordHash,
      role: UserRole.CUSTOMER,
      customer: {
        create: {
          customerType: input.customerType,
          legalName: input.legalName?.trim() || undefined,
          gstin: input.gstin?.trim() || undefined,
          stateCode: input.stateCode.trim(),
          state: input.state.trim(),
        },
      },
    },
    include: { customer: true },
  });
}
