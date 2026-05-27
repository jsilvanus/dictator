import { and, eq, isNull } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { getRequiredSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { shares } from '@/lib/db/schema';

function randomToken() {
  return crypto.randomUUID().replaceAll('-', '');
}

export async function POST(request: Request) {
  try {
    const session = await getRequiredSession();
    const body = (await request.json()) as { documentId: string; permission: 'read' | 'edit' };

    const [existing] = await db
      .select({ token: shares.token })
      .from(shares)
      .where(and(eq(shares.documentId, body.documentId), isNull(shares.sharedWith), eq(shares.sharedBy, session.userId)));

    const token = existing?.token ?? randomToken();

    if (!existing) {
      await db.insert(shares).values({
        documentId: body.documentId,
        sharedBy: session.userId,
        sharedWith: null,
        permission: body.permission,
        token,
      });
    }

    return NextResponse.json({ token, url: `${process.env.NEXTAUTH_URL}/share/${token}` });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }

  const [share] = await db
    .select({ documentId: shares.documentId, permission: shares.permission })
    .from(shares)
    .where(eq(shares.token, token));

  if (!share) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(share);
}
