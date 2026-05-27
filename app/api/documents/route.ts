import { and, desc, eq, isNotNull, or } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { getRequiredSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { documents, shares } from '@/lib/db/schema';

export async function GET() {
  try {
    const session = await getRequiredSession();

    const rows = await db
      .select({
        id: documents.id,
        title: documents.title,
        wordCount: documents.wordCount,
        updatedAt: documents.updatedAt,
        folderId: documents.folderId,
        ownerId: documents.ownerId,
        sharedBy: shares.sharedBy,
      })
      .from(documents)
      .leftJoin(
        shares,
        and(eq(shares.documentId, documents.id), eq(shares.sharedWith, session.userId), isNotNull(shares.id)),
      )
      .where(or(eq(documents.ownerId, session.userId), eq(shares.sharedWith, session.userId)))
      .orderBy(desc(documents.updatedAt));

    return NextResponse.json(rows);
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: await error.text() }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getRequiredSession();
    const body = (await request.json()) as { folderId?: string };

    const [created] = await db
      .insert(documents)
      .values({
        ownerId: session.userId,
        folderId: body.folderId ?? null,
        title: 'Untitled',
        content: { type: 'doc', content: [{ type: 'paragraph' }] },
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: await error.text() }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
