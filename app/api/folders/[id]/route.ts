import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { getRequiredSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { folders } from '@/lib/db/schema';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getRequiredSession();
    const { id } = await params;
    const body = (await request.json()) as { name: string };

    const [updated] = await db
      .update(folders)
      .set({ name: body.name })
      .where(and(eq(folders.id, id), eq(folders.ownerId, session.userId)))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: await error.text() }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getRequiredSession();
    const { id } = await params;

    await db.delete(folders).where(and(eq(folders.id, id), eq(folders.ownerId, session.userId)));

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: await error.text() }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
