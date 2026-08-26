import { NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import { auth } from '@/lib/auth';
import { buildItemsTemplate } from '@/lib/services/bulk-import';

const ITEM_MANAGER_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.PROCUREMENT_MAKER];

export async function GET() {
  const session = await auth();
  if (!session?.user || !ITEM_MANAGER_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const buffer = buildItemsTemplate();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="chainsync-items-template.xlsx"',
    },
  });
}
