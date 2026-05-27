import { and, eq, isNull } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { getRequiredSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { documents, shares, users } from '@/lib/db/schema';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getRequiredSession();
    const { id } = await params;

    const [doc] = await db
      .select({ ownerId: documents.ownerId })
      .from(documents)
      .where(eq(documents.id, id));

    if (!doc || doc.ownerId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rows = await db
      .select({
        id: shares.id,
        permission: shares.permission,
        email: users.email,
        name: users.name,
      })
      .from(shares)
      .leftJoin(users, eq(users.id, shares.sharedWith))
      .where(and(eq(shares.documentId, id), isNull(shares.token)));

    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getRequiredSession();
    const { id } = await params;
    const body = (await request.json()) as { email: string; permission: 'read' | 'edit' };

    const [targetUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, body.email));

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const [created] = await db
      .insert(shares)
      .values({
        documentId: id,
        sharedBy: session.userId,
        sharedWith: targetUser.id,
        permission: body.permission,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getRequiredSession();
    const { id } = await params;
    const url = new URL(request.url);
    const shareId = url.searchParams.get('shareId');

    const [doc] = await db
      .select({ ownerId: documents.ownerId })
      .from(documents)
      .where(eq(documents.id, id));

    if (!doc || doc.ownerId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!shareId) {
      return NextResponse.json({ error: 'shareId required' }, { status: 400 });
    }

    await db.delete(shares).where(and(eq(shares.id, shareId), eq(shares.documentId, id)));

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
