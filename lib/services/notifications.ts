import { Prisma, NotificationChannel, UserRole } from '@prisma/client';
import { sendEmail } from '@/lib/services/email';

// Fans an in-app alert + real email out to everyone who can act on procurement exceptions
// (MOQ conflicts, stock shortages, disputes, price proposals) — used by the routing engine
// to "alert the internal team first" before anything gets auto-cancelled.
export async function notifyInternalTeam(
  tx: Prisma.TransactionClient,
  title: string,
  message: string,
  relatedEntityType?: string,
  relatedEntityId?: string
) {
  const staff = await tx.user.findMany({
    where: { role: { in: [UserRole.ADMIN, UserRole.PROCUREMENT_MAKER] }, isActive: true },
    select: { id: true, email: true },
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

  await Promise.all(
    staff.filter((u) => u.email).map((u) => sendEmail(u.email as string, title, message))
  );
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

  if (channel === NotificationChannel.EMAIL) {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (user?.email) {
      await sendEmail(user.email, title, message);
    }
  }
}
