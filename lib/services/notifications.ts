import { Prisma, NotificationChannel, UserRole } from '@prisma/client';

// Fans an in-app alert out to everyone who can act on procurement exceptions
// (MOQ conflicts, stock shortages) — used by the routing engine to "alert the
// internal team first" before anything gets auto-cancelled.
export async function notifyInternalTeam(
  tx: Prisma.TransactionClient,
  title: string,
  message: string,
  relatedEntityType?: string,
  relatedEntityId?: string
) {
  const staff = await tx.user.findMany({
    where: { role: { in: [UserRole.ADMIN, UserRole.PROCUREMENT_MAKER] }, isActive: true },
    select: { id: true },
  });
  if (staff.length === 0) return;

  await tx.notification.createMany({
    data: staff.map((u) => ({
      userId: u.id,
      channel: NotificationChannel.IN_APP,
      title,
      message,
      relatedEntityType,
      relatedEntityId,
    })),
  });
}

export async function notifyCustomer(
  tx: Prisma.TransactionClient,
  userId: string,
  title: string,
  message: string,
  relatedEntityType?: string,
  relatedEntityId?: string,
  channel: NotificationChannel = NotificationChannel.EMAIL
) {
  await tx.notification.create({
    data: { userId, channel, title, message, relatedEntityType, relatedEntityId },
  });
}
