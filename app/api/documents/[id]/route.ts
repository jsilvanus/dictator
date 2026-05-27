import { and, desc, eq, or, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { getRequiredSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { documents, documentVersions, shares } from '@/lib/db/schema';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getRequiredSession();
    const { id } = await params;

    const [row] = await db
      .select({
        id: documents.id,
        ownerId: documents.ownerId,
        title: documents.title,
        content: documents.content,
        wordCount: documents.wordCount,
      })
      .from(documents)
      .leftJoin(shares, eq(shares.documentId, documents.id))
      .where(
        and(or(eq(documents.ownerId, session.userId), eq(shares.sharedWith, session.userId)), eq(documents.id, id)),
      );

    if (!row) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(row);
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: await error.text() }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getRequiredSession();
    const { id } = await params;
    const body = (await request.json()) as {
      title: string;
      content: Record<string, unknown>;
      wordCount: number;
      saveCount?: number;
    };

    const [doc] = await db
      .select({
        id: documents.id,
        ownerId: documents.ownerId,
        canEdit: shares.permission,
      })
      .from(documents)
      .leftJoin(shares, and(eq(shares.documentId, documents.id), eq(shares.sharedWith, session.userId)))
      .where(eq(documents.id, id));

    if (!doc || (doc.ownerId !== session.userId && doc.canEdit !== 'edit')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [updated] = await db
      .update(documents)
      .set({
        title: body.title,
        content: body.content,
        wordCount: body.wordCount,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, id))
      .returning();

    if (body.saveCount && body.saveCount % 10 === 0) {
      await db.transaction(async (tx) => {
        await tx.insert(documentVersions).values({
          documentId: id,
          content: body.content,
        });

        const staleRows = await tx
          .select({ id: documentVersions.id })
          .from(documentVersions)
          .where(eq(documentVersions.documentId, id))
          .orderBy(desc(documentVersions.savedAt))
          .offset(20);

        if (staleRows.length > 0) {
          await tx.execute(
            sql`delete from document_versions where id in (${sql.join(
              staleRows.map((row) => sql`${row.id}`),
              sql`,`,
            )})`,
          );
        }
      });
    }

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

    const [doc] = await db.select().from(documents).where(eq(documents.id, id));

    if (!doc || doc.ownerId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.delete(documents).where(eq(documents.id, id));

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: await error.text() }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
