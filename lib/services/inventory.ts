import { ReservationStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { runSerializable } from '@/lib/services/tx-utils';

const RESERVATION_TTL_MINUTES = 15;

export class MoqNotMetError extends Error {}
export class InsufficientStockError extends Error {}

export async function validateCustomerMoq(companyId: string, productId: string, quantity: number) {
  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
  // A Product's id is globally unique, not scoped to a firm — without this check a customer
  // could add another firm's product to their cart just by knowing its id.
  if (product.companyId !== companyId) throw new MoqNotMetError('This product is not available.');
  if (quantity < product.minCustomerMoq) {
    throw new MoqNotMetError(
      `Minimum order quantity for ${product.sku} is ${product.minCustomerMoq}; requested ${quantity}.`
    );
  }
  return product;
}

// Places a 15-minute hold on WAREHOUSE stock when a customer adds it to their cart.
// Available stock is always computed as warehouseStock minus currently-ACTIVE,
// non-expired reservations — never by mutating Product.warehouseStock directly — so an
// abandoned cart needs no compensating write to "give the stock back"; it simply stops
// counting once expiresAt passes (see releaseExpiredReservations).
export async function reserveStock(companyId: string, productId: string, customerId: string, quantity: number) {
  return runSerializable(async (tx) => {
    const product = await tx.product.findUniqueOrThrow({ where: { id: productId } });
    if (product.companyId !== companyId) throw new InsufficientStockError('This product is not available.');

    const activeReserved = await tx.stockReservation.aggregate({
      where: { productId, status: ReservationStatus.ACTIVE, expiresAt: { gt: new Date() } },
      _sum: { quantity: true },
    });
    const available = product.warehouseStock - (activeReserved._sum.quantity ?? 0);
    if (available < quantity) {
      throw new InsufficientStockError(`Only ${Math.max(available, 0)} units of ${product.sku} available.`);
    }

    return tx.stockReservation.create({
      data: {
        productId,
        customerId,
        quantity,
        status: ReservationStatus.ACTIVE,
        expiresAt: new Date(Date.now() + RESERVATION_TTL_MINUTES * 60_000),
      },
    });
  });
}

// Scheduled sweep (run every minute, e.g. via pg_cron or a Next.js cron route) — expires
// reservations whose 15-minute hold lapsed without checkout, releasing them back to the pool.
export async function releaseExpiredReservations() {
  const result = await prisma.stockReservation.updateMany({
    where: { status: ReservationStatus.ACTIVE, expiresAt: { lte: new Date() } },
    data: { status: ReservationStatus.EXPIRED },
  });
  return result.count;
}

// Explicit release, e.g. when a customer removes an item from their cart before it expires.
export async function releaseReservation(reservationId: string) {
  return prisma.stockReservation.update({
    where: { id: reservationId },
    data: { status: ReservationStatus.RELEASED },
  });
}
