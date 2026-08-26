import { NextRequest, NextResponse } from 'next/server';
import { releaseExpiredReservations } from '@/lib/services/inventory';
import { autoCancelStaleMoqConflicts } from '@/lib/services/order-routing';
import { closeDisputeWindows } from '@/lib/services/dispute';

// Runs every scheduled sweep the system depends on: releasing lapsed cart holds, escalating
// stale MOQ conflicts to auto-cancellation, and closing 24-hour dispute windows into final
// billing. Point an external scheduler at this route — Vercel Cron, a self-hosted crontab
// `curl`, or pg_cron calling out over http — with `Authorization: Bearer $CRON_SECRET`.
// Every sweep it calls is idempotent, so running it more often than strictly needed is
// harmless; a 1-minute interval covers the 15-minute reservation TTL comfortably.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [releasedReservations, cancelledMoqConflicts, disputeWindowResult] = await Promise.all([
    releaseExpiredReservations(),
    autoCancelStaleMoqConflicts(),
    closeDisputeWindows(),
  ]);

  return NextResponse.json({
    releasedReservations,
    cancelledMoqConflicts,
    finalizedShipments: disputeWindowResult.finalizedShipments,
    invoicedOrders: disputeWindowResult.invoicedOrders,
  });
}
