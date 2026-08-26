import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

const MAX_RETRIES = 3;

export function isSerializationFailure(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034';
}

// Postgres SERIALIZABLE transactions can abort under write conflicts by design (e.g. two
// concurrent checkouts racing the same product's warehouseStock). Retrying a few times is
// the standard way to ride that out rather than weakening isolation on shared-inventory paths.
export async function runSerializable<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await prisma.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (err) {
      if (isSerializationFailure(err) && attempt < MAX_RETRIES) continue;
      throw err;
    }
  }
  throw new Error('unreachable');
}
