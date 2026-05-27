import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';

import { db } from '@/lib/db';

export async function GET() {
  try {
    const [{ version }] = await db.execute<{ version: string }>(sql`select version()`);

    return NextResponse.json({
      status: 'ok',
      version,
      db: 'connected',
    });
  } catch {
    return NextResponse.json(
      {
        status: 'degraded',
        version: null,
        db: 'unreachable',
      },
      { status: 503 },
    );
  }
}
