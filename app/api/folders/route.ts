import { count, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { getRequiredSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { documents, folders } from '@/lib/db/schema';

export async function GET() {
  try {
    const session = await getRequiredSession();

    const rows = await db
      .select({
        id: folders.id,
        name: folders.name,
        createdAt: folders.createdAt,
        documentCount: count(documents.id),
      })
      .from(folders)
      .leftJoin(documents, eq(documents.folderId, folders.id))
      .where(eq(folders.ownerId, session.userId))
      .groupBy(folders.id);

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
    const body = (await request.json()) as { name: string };

    const [created] = await db
      .insert(folders)
      .values({ ownerId: session.userId, name: body.name })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: await error.text() }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
