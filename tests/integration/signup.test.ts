import { describe, it, expect, afterEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { registerCustomer } from '@/lib/services/signup';
import { CustomerType } from '@prisma/client';
import { hasDatabase } from './helpers';

describe.skipIf(!hasDatabase)('signup service (live DB)', () => {
  let createdUserId: string | null = null;

  afterEach(async () => {
    if (createdUserId) {
      await prisma.customer.deleteMany({ where: { userId: createdUserId } });
      await prisma.user.delete({ where: { id: createdUserId } }).catch(() => {});
      createdUserId = null;
    }
  });

  it('creates a User + Customer together with a working password hash', async () => {
    const email = `test-signup-${Date.now()}@example.com`;
    const user = await registerCustomer({
      name: 'Test Customer',
      email,
      password: 'TestPass123',
      customerType: CustomerType.B2C,
      stateCode: '27',
      state: 'Maharashtra',
    });
    createdUserId = user.id;

    expect(user.role).toBe('CUSTOMER');
    expect(user.customer).toBeTruthy();
    expect(await bcrypt.compare('TestPass123', user.passwordHash!)).toBe(true);
  });

  it('rejects a duplicate email', async () => {
    const email = `test-signup-dup-${Date.now()}@example.com`;
    const user = await registerCustomer({
      name: 'First',
      email,
      password: 'TestPass123',
      customerType: CustomerType.B2C,
      stateCode: '27',
      state: 'Maharashtra',
    });
    createdUserId = user.id;

    await expect(
      registerCustomer({ name: 'Second', email, password: 'TestPass123', customerType: CustomerType.B2C, stateCode: '27', state: 'Maharashtra' })
    ).rejects.toThrow(/already exists/);
  });

  it('rejects a B2B signup without a GSTIN', async () => {
    await expect(
      registerCustomer({
        name: 'B2B No GST',
        email: `test-signup-b2b-${Date.now()}@example.com`,
        password: 'TestPass123',
        customerType: CustomerType.B2B,
        stateCode: '27',
        state: 'Maharashtra',
      })
    ).rejects.toThrow(/GSTIN is required/);
  });

  it('rejects a short password', async () => {
    await expect(
      registerCustomer({
        name: 'Short Pass',
        email: `test-signup-short-${Date.now()}@example.com`,
        password: 'short',
        customerType: CustomerType.B2C,
        stateCode: '27',
        state: 'Maharashtra',
      })
    ).rejects.toThrow(/at least 8 characters/);
  });
});
