import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

// Best-effort, fire-after-commit — same pattern as notifyInternalTeam: audit logging should
// never be the reason a real mutation (a payment, an approval, an invoice) fails, so a logging
// failure is swallowed and reported to the server console rather than surfaced to the caller.
export async function writeAuditLog(
  actorUserId: string | null,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId,
        action,
        entityType,
        entityId,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    console.error(`[audit] Failed to write "${action}" on ${entityType}:${entityId}:`, err);
  }
}
