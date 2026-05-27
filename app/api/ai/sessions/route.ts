import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { getRequiredSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { aiSessions } from '@/lib/db/schema';

export async function GET(request: Request) {
  try {
    const session = await getRequiredSession();
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json({ error: 'documentId required' }, { status: 400 });
    }

    const [row] = await db
      .select()
      .from(aiSessions)
      .where(
        and(
          eq(aiSessions.documentId, documentId),
          eq(aiSessions.userId, session.userId),
          eq(aiSessions.mode, 'panel'),
        ),
      );

    return NextResponse.json({ turns: row?.turns ?? [] });
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: await error.text() }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getRequiredSession();
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json({ error: 'documentId required' }, { status: 400 });
    }

    await db
      .delete(aiSessions)
      .where(
        and(
          eq(aiSessions.documentId, documentId),
          eq(aiSessions.userId, session.userId),
          eq(aiSessions.mode, 'panel'),
        ),
      );

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: await error.text() }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
