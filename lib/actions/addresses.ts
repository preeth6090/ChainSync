'use server';

import { AddressType } from '@prisma/client';
import { requireCustomer } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

export async function getMyAddressesAction() {
  const customer = await requireCustomer();
  const addresses = await prisma.address.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: 'desc' },
  });
  return addresses.map((a) => ({
    id: a.id,
    line1: a.line1,
    line2: a.line2,
    city: a.city,
    state: a.state,
    stateCode: a.stateCode,
    pincode: a.pincode,
    isDefault: a.isDefault,
  }));
}

export interface NewAddressInput {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
}

export async function addAddressAction(input: NewAddressInput) {
  const customer = await requireCustomer();
  if (!input.line1.trim() || !input.city.trim() || !input.state.trim() || !input.stateCode.trim() || !input.pincode.trim()) {
    throw new Error('All address fields except line 2 are required.');
  }
  const address = await prisma.address.create({
    data: { ...input, type: AddressType.SHIPPING, customerId: customer.id },
  });
  return { id: address.id };
}
