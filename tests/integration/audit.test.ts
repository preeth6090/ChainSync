import { describe, it, expect, afterEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/services/audit';
import { hasDatabase } from './helpers';

describe.skipIf(!hasDatabase)('audit log (live DB)', () => {
  let createdId: string | null = null;

  afterEach(async () => {
    if (createdId) {
      await prisma.auditLog.delete({ where: { id: createdId } }).catch(() => {});
      createdId = null;
    }
  });

  it('writes a row with actor, action, entity, and metadata', async () => {
    const admin = await prisma.user.findFirstOrThrow({ where: { email: 'admin@chainsync.test' } });
    await writeAuditLog(admin.id, 'TEST_EVENT', 'TestEntity', 'entity-123', { note: 'hello' });

    const row = await prisma.auditLog.findFirstOrThrow({
      where: { action: 'TEST_EVENT', entityId: 'entity-123' },
      orderBy: { createdAt: 'desc' },
    });
    createdId = row.id;

    expect(row.actorUserId).toBe(admin.id);
    expect(row.entityType).toBe('TestEntity');
    expect(row.metadata).toEqual({ note: 'hello' });
  });

  it('accepts a null actor for system-triggered events', async () => {
    await writeAuditLog(null, 'TEST_SYSTEM_EVENT', 'TestEntity', 'entity-456');
    const row = await prisma.auditLog.findFirstOrThrow({
      where: { action: 'TEST_SYSTEM_EVENT', entityId: 'entity-456' },
      orderBy: { createdAt: 'desc' },
    });
    createdId = row.id;
    expect(row.actorUserId).toBeNull();
  });
});
